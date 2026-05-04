import { notFound } from 'next/navigation';
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Shield,
  Users,
  Minus,
  Flame,
  Globe,
  MoreHorizontal,
  PieChart,
  Activity,
  Target,
  User,
  ArrowRight,
  Plus,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { DossierActions } from '@/components/profile/DossierActions';
import { FollowButton } from '@/components/profile/FollowButton';
import { FilingsList } from '@/components/profile/FilingsList';
import { PostsFeed } from '@/components/profile/PostsFeed';
import { D3ProfileGauge } from '@/components/viz/D3ProfileGauge';
import { ScoreRadar } from '@/components/viz/ScoreRadar';
import { D3AreaChart } from '@/components/viz/D3AreaChart';
import { SimilarProfiles } from '@/components/profile/SimilarProfiles';
import { AccountShareButton } from '@/components/profile/AccountShareButton';
import { formatPlatform, cn } from '@/lib/utils';
import { BASE_SCORE } from '@/lib/scoring';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import { getCurrentUser } from '@/lib/auth';
import { enrichPublicProfileDetails, needsProfileEnrichment } from '@/lib/profileEnrichment';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'overview', label: 'Overview', Icon: PieChart },
  { id: 'activity', label: 'Activity', Icon: Activity },
  { id: 'impact', label: 'Impact', Icon: Target },
  { id: 'about', label: 'About', Icon: User },
] as const;

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) notFound();

  let account = await accountsRepo.findById(id.data);
  if (!account) {
    const [platform, ...rest] = id.data.split('_');
    const username = rest.join('_');
    if (platform === 'website') {
      const { findByUsername } = await import('@/lib/repos/users');
      const user = await findByUsername(username);
      if (user) {
        // Always use a Firebase-safe key (dots/special chars → hyphens) so the
        // account ID is stable and can be looked up from the reports API.
        const safeId = accountsRepo.deriveId('website', user.username);
        // If the URL used a dotted username, the safe key differs — check it first.
        if (safeId !== id.data) {
          account = await accountsRepo.findById(safeId);
        }
        if (!account) {
          account = await accountsRepo.createWithId(safeId, {
            platform: 'website',
            username: user.username,
            displayName: user.name || user.username,
            bio: user.bio || 'Platform User',
            avatarUrl: user.photoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name || user.username)}`,
            verified: true,
            followers: 'unknown',
            claimable: true,
            credibility: 80,
            enrichmentStatus: 'none',
            role: 'Platform User',
            score: user.score ?? BASE_SCORE,
            scoreHistory: user.scoreHistory?.map((h: any) => ({ ...h, s: h.s ?? h.score ?? BASE_SCORE })) ?? [{ t: new Date().toISOString(), s: BASE_SCORE, cause: 'seed' }],
            breakdown: { authenticity: 50, engagement: 50, community: 50, content: 50, impact: 50 },
            posts: [],
            claimed: false,
            claimedBy: null
          });
        }
      } else {
        notFound();
      }
    } else {
      notFound();
    }
  }

  // Synchronize dynamic user data if it's a website account
  let linkedUser: Awaited<ReturnType<typeof usersRepo.findById>> = null;
  if (account.platform === 'website') {
    const { findByUsername } = await import('@/lib/repos/users');
    const user = await findByUsername(account.username);
    if (user) {
      linkedUser = user;
      account.avatarUrl = user.photoUrl || account.avatarUrl;
      account.displayName = user.name || account.displayName;
      account.bio = user.bio || account.bio;
      account.score = user.score ?? account.score;
      account.scoreHistory = user.scoreHistory?.map((h: any) => ({ ...h, s: h.s ?? h.score ?? BASE_SCORE })) ?? account.scoreHistory;
      
      // Inject the user's filed reports as "posts" to populate the feed
      const { listByReporter } = await import('@/lib/repos/reports');
      const userReports = await listByReporter(user._id);
      
      account.posts = userReports.map(report => ({
        externalId: report._id,
        content: `Filed a ${report.type} report: ${report.deed || report.description || 'No description provided.'}`,
        likes: String(report.stats?.aligns ?? 0),
        replies: String(report.stats?.comments ?? 0),
        capturedAt: report.createdAt || new Date().toISOString()
      }));
    }
  }

  if (needsProfileEnrichment(account)) {
    try {
      await accountsRepo.update(account._id, { enrichmentStatus: 'pending' });
      const patch = await enrichPublicProfileDetails(account);
      account = (await accountsRepo.update(account._id, patch)) ?? account;
    } catch (error) {
      console.error('[profile-enrichment] failed', error);
      account = (await accountsRepo.update(account._id, {
        enrichmentStatus: 'stale',
        evidenceSummary: 'Gemini profile enrichment failed. Try again later.',
      })) ?? account;
    }
  }

  const [filingsRaw, allTop, currentViewer] = await Promise.all([
    reportsRepo.listForAccount(id.data, ['approved', 'ai_reviewed', 'flagged'], 30),
    accountsRepo.listAll(120).catch(() => []),
    getCurrentUser().catch(() => null),
  ]);

  const isViewerFollowing = linkedUser
    ? (linkedUser.followers ?? []).includes(currentViewer?._id ?? '')
    : false;

  const reporterIds = Array.from(new Set(filingsRaw.map(f => f.reporterId).filter(Boolean) as string[]));
  const reporters = await Promise.all(reporterIds.map(rid => usersRepo.findById(rid)));
  const reporterMap = new Map(reporters.filter(Boolean).map(u => [u!._id, u!]));

  const filings = filingsRaw.map(f => ({
    ...f,
    reporter: f.reporterId ? reporterMap.get(f.reporterId) : undefined
  }));

  // Real ledger history → derive deltas, total impact, weekly delta, area chart points
  const history = account.scoreHistory?.length
    ? account.scoreHistory
    : [{ t: account.createdAt ?? new Date().toISOString(), s: account.score, cause: 'seed' as const }];

  const previous = history.length > 1 ? history[history.length - 2].s : BASE_SCORE;
  const delta = Number((account.score - previous).toFixed(2));

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyDeltaRaw = history
    .filter((h: any) => h.t && new Date(h.t).getTime() >= weekAgo)
    .reduce((sum: number, h: any) => sum + (h.delta ?? 0), 0);
  const weeklyDelta = Number(weeklyDeltaRaw.toFixed(2));

  const totalPositiveImpact = history.reduce(
    (sum: number, h: any) => sum + (h.delta && h.delta > 0 ? h.delta : 0),
    0,
  );
  const totalNegativeImpact = history.reduce(
    (sum: number, h: any) => sum + (h.delta && h.delta < 0 ? Math.abs(h.delta) : 0),
    0,
  );

  function formatImpact(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }

  // Area chart data
  const sortedHistory = [...history]
    .filter((h: any) => h.t)
    .sort((a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime());
  const creationTime = account.createdAt
    ? new Date(account.createdAt)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const areaChartData = sortedHistory.length > 0
    ? sortedHistory.map((entry: any) => ({ date: new Date(entry.t), value: entry.s }))
    : [
      { date: creationTime, value: BASE_SCORE },
      { date: new Date(), value: account.score },
    ];

  const socialLinks = Object.entries(account.socialLinks ?? {}).filter(([, link]) => link?.url);
  const windowScores = account.windowScores;

  // Similar profiles: same platform, exclude self, sort by score descending
  const similarProfiles = allTop
    .filter((acc) => acc._id !== account!._id && acc.platform === account!.platform)
    .slice(0, 5);

  const activeTab = searchParams.tab || 'overview';

  return (
    <main className="min-h-screen overflow-x-hidden bg-background safe-bottom font-sans">
      {/* Sticky header with back + share */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl pt-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 pb-3 sm:px-4">
          <Link
            href="/feed"
            aria-label="Back to feed"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[13px] font-bold text-foreground sm:text-[14px] whitespace-nowrap">
              {account.displayName.replace(/^@/, '')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <AccountShareButton
              displayName={account.displayName}
              username={account.username}
              cardData={{
                displayName: account.displayName,
                username: account.username,
                avatarUrl: account.avatarUrl,
                ledgerScore: account.score,
                credibility: account.credibility ?? 80,
                weeklyDelta,
                totalImpact: formatImpact(totalPositiveImpact),
                followers: account.followers || '—',
                role: account.role || `${formatPlatform(account.platform)} Profile`,
                location: account.region,
                isVerified: account.verified,
                platform: account.platform,
                multipliers: {
                  massiveAction: linkedUser?.massiveAction,
                  people: linkedUser?.peopleMultiplier,
                  reach: linkedUser?.reachMultiplier,
                  impact: linkedUser?.impactMultiplier,
                  credibility: linkedUser?.credibilityMultiplier,
                  momentum: linkedUser?.momentumMultiplier,
                  innovation: linkedUser?.innovationMultiplier,
                  community: linkedUser?.communityMultiplier,
                  resource: linkedUser?.resourceMultiplier,
                  legacy: linkedUser?.legacyMultiplier,
                },
              }}
            />
            <button
              type="button"
              aria-label="More"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95"
            >
              <MoreHorizontal size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 mt-16">
        {/* Profile Info Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end w-full min-w-0">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
              {account.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.avatarUrl}
                  alt={account.displayName}
                  className="h-full w-full rounded-full object-cover border border-border bg-muted"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full border border-border bg-muted font-serif text-2xl text-muted-foreground sm:text-3xl">
                  {account.displayName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              {account.verified && (
                <div className="absolute bottom-0 right-0 rounded-full border-[3px] border-background bg-foreground text-background p-0.5">
                  <CheckCircle2 size={14} fill="currentColor" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[20px] font-bold text-foreground leading-tight sm:text-[22px] whitespace-nowrap">
                  {account.displayName.replace(/^@/, '')}
                </h1>
                {account.verified && (
                  <CheckCircle2 size={16} fill="currentColor" className="text-foreground shrink-0" />
                )}
              </div>
              <p className="text-[12px] text-muted-foreground capitalize sm:text-[13px]">
                {account.profileKind === 'public_figure'
                  ? 'Public Figure'
                  : account.role || `${formatPlatform(account.platform)} dossier`}
              </p>
              {account.region && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  <Globe size={12} /> {account.region}
                </div>
              )}
              {linkedUser && (
                <div className="mt-2 flex items-center gap-3 text-[12px]">
                  <span className="text-foreground font-bold">
                    {(linkedUser.following ?? []).length}
                    <span className="font-normal text-muted-foreground ml-1">Following</span>
                  </span>
                  <span className="text-foreground font-bold">
                    {(linkedUser.followers ?? []).length}
                    <span className="font-normal text-muted-foreground ml-1">Followers</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons row (Report / Claim / Audit / Follow) — full width on mobile */}
          <div className="sm:ml-auto sm:shrink-0 flex flex-col items-end gap-2">
            {linkedUser && currentViewer && currentViewer._id !== linkedUser._id && (
              <FollowButton targetUserId={linkedUser._id} initialFollowing={isViewerFollowing} />
            )}
            <DossierActions
              accountId={account._id}
              claimedBy={account.claimedBy}
              claimable={(account.claimable as boolean | undefined) !== false}
            />
          </div>
        </div>

        {/* Score Gauge Hero — properly centered */}
        <div className="mt-10 mb-6 flex justify-center">
          <D3ProfileGauge score={account.score} minScore={-99000} maxScore={101000} size={340} />
        </div>

        {/* 4 Stat Cards with REAL data - Enhanced Premium Look */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* This Week */}

          <div className="group relative overflow-hidden rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col items-center text-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full mb-3',
                  weeklyDelta > 0
                    ? 'bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400'
                    : weeklyDelta < 0
                    ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {weeklyDelta > 0 ? (
                  <TrendingUp size={16} strokeWidth={2.5} />
                ) : weeklyDelta < 0 ? (
                  <TrendingDown size={16} strokeWidth={2.5} />
                ) : (
                  <Minus size={16} strokeWidth={2.5} />
                )}
              </div>
              <p
                className={cn(
                  'text-[22px] font-black tabular-nums tracking-tight leading-none',
                  weeklyDelta > 0 ? 'text-green-600 dark:text-green-400' : weeklyDelta < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
                )}
              >
                {weeklyDelta > 0 ? '+' : ''}
                {weeklyDelta.toLocaleString()}
              </p>
              <p className="mt-1 text-[12px] font-bold text-muted-foreground">This Week</p>
            </div>
            {/* Decorative Sparkline */}
            <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40 transition-opacity group-hover:opacity-100">
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full">
                <path
                  d="M0,20 C20,15 30,5 50,10 C70,15 80,5 100,2 L100,20 Z"
                  className={weeklyDelta >= 0 ? "fill-green-500/20" : "fill-red-500/20"}
                />
                <path
                  d="M0,20 C20,15 30,5 50,10 C70,15 80,5 100,2"
                  fill="none"
                  className={weeklyDelta >= 0 ? "stroke-green-500" : "stroke-red-500"}
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Total Impact */}
          <div className="group relative overflow-hidden rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full mb-3 bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400">
                <Flame size={16} strokeWidth={2.5} />
              </div>
              <p className="text-[22px] font-black tabular-nums tracking-tight leading-none text-foreground">
                {formatImpact(totalPositiveImpact)}
              </p>
              <p className="mt-1 text-[12px] font-bold text-muted-foreground">Total Impact</p>
            </div>
            {/* Decorative Sparkline */}
            <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40 transition-opacity group-hover:opacity-100">
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full">
                <path
                  d="M0,20 C20,10 40,18 60,8 C80,-2 90,12 100,5 L100,20 Z"
                  className="fill-red-500/20"
                />
                <path
                  d="M0,20 C20,10 40,18 60,8 C80,-2 90,12 100,5"
                  fill="none"
                  className="stroke-red-500"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Followers */}
          <div className="rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full mb-3 bg-muted text-foreground">
                <Users size={16} strokeWidth={2.5} />
              </div>
              <p className="text-[22px] font-black tabular-nums tracking-tight leading-none text-foreground">
                {account.followers || '—'}
              </p>
              <p className="mt-1 text-[12px] font-bold text-muted-foreground">Followers</p>
            </div>
          </div>

          {/* Credibility */}
          <div className="rounded-[24px] border border-border bg-background p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full mb-3 bg-muted text-foreground">
                <Shield size={16} strokeWidth={2.5} />
              </div>
              <p className="text-[22px] font-black tabular-nums tracking-tight leading-none text-foreground">
                {account.credibility ?? 80}%
              </p>
              <p className="mt-1 text-[12px] font-bold text-muted-foreground">Credibility</p>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-1000 ease-out"
                style={{ width: `${account.credibility ?? 80}%` }}
              />
            </div>
          </div>
        </div>

        {windowScores && (
          <div className="mt-4 rounded-[24px] border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-foreground">Workbook Score Tracker</h2>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Ledger
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['W1', windowScores.w1Delta, windowScores.w1Decay, windowScores.w1Score],
                ['W2', windowScores.w2Delta, windowScores.w2Decay, windowScores.w2Score],
                ['W3', windowScores.w3Delta, windowScores.w3Decay, windowScores.w3Score],
              ].map(([label, windowDelta, decayValue, scoreValue]) => (
                <div key={String(label)} className="rounded-2xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="mt-1 text-[15px] font-black text-foreground">{Number(scoreValue).toLocaleString()}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Δ {Number(windowDelta).toLocaleString()} · d {Number(decayValue).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2 text-[12px] font-bold">
              <span className="text-muted-foreground">Lifetime ledger total</span>
              <span className="text-foreground">{Math.round(account.globalScore ?? 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 flex justify-between gap-2 overflow-x-auto whitespace-nowrap border-b border-border text-[13px] font-semibold text-muted-foreground no-scrollbar">
          {TABS.map(({ id: tabId, label, Icon }) => (
            <Link
              key={tabId}
              href={`?tab=${tabId}`}
              className={cn(
                'flex flex-1 flex-col items-center gap-1.5 px-3 py-3 border-b-2 transition-colors',
                activeTab === tabId
                  ? 'border-foreground text-foreground'
                  : 'border-transparent hover:text-foreground',
              )}
            >
              <Icon size={18} strokeWidth={activeTab === tabId ? 2.5 : 2} />
              {label}
            </Link>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="mt-6 mb-12 space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {account.posts && account.posts.length > 0 && (
                <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-bold text-foreground">Recent Posts</h3>
                    <Link
                      href="?tab=activity"
                      className="text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      View all <ArrowRight size={14} />
                    </Link>
                  </div>
                  <PostsFeed posts={account.posts.slice(0, 3)} />
                </div>
              )}

              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-bold text-foreground">Recent Filings</h3>
                  {filings.length > 0 && (
                    <Link
                      href="?tab=activity"
                      className="text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      View all <ArrowRight size={14} />
                    </Link>
                  )}
                </div>

                {filings.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <AlertCircle size={28} className="text-muted-foreground/40" />
                    <p className="text-[13px] text-muted-foreground">No recent activity recorded.</p>
                    <p className="max-w-xs text-[12px] text-muted-foreground/70">
                      File the first report on this dossier to populate the ledger.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filings.slice(0, 4).map((filing: any) => {
                      const isPositive = filing.type === 'positive';
                      const score =
                        filing.adminDecision?.finalImpact ??
                        filing.aiVerdict?.proposedImpact ??
                        filing.reportScore ??
                        filing.baseScore ??
                        0;
                      return (
                        <div
                          key={filing._id}
                          className="flex items-center gap-3 rounded-2xl border border-border p-3"
                        >
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                              isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {isPositive ? (
                              <Plus size={14} strokeWidth={3} />
                            ) : (
                              <Minus size={14} strokeWidth={3} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug">
                              {filing.deed || filing.description || 'Filing recorded'}
                            </h4>

                            <p className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                              {filing.reporter && (
                                <>
                                  <Link
                                    href={filing.reporter.username === 'anonymous' ? '#' : `/account/website_${filing.reporter.username.replace(/^@/, '')}`}
                                    className={cn(
                                      "font-bold text-foreground/70 hover:text-primary transition-colors",
                                      filing.reporter.username === 'anonymous' && "pointer-events-none opacity-50"
                                    )}
                                  >
                                    {filing.reporter.name || filing.reporter.username.replace(/^@/, '')}
                                  </Link>
                                  <span>•</span>
                                </>
                              )}
                              <span>
                                {filing.createdAt
                                  ? new Date(filing.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : 'Recent'}
                              </span>
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums',
                              isPositive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {score > 0 ? '+' : ''}
                            {Math.round(score)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top-level stats summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Filings
                  </p>
                  <p className="mt-1 text-[22px] font-black text-foreground tabular-nums">
                    {filings.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Positive impact
                  </p>
                  <p className="mt-1 text-[22px] font-black text-primary tabular-nums">
                    +{formatImpact(totalPositiveImpact)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4 shadow-sm col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Negative impact
                  </p>
                  <p className="mt-1 text-[22px] font-black text-destructive tabular-nums">
                    −{formatImpact(totalNegativeImpact)}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <>
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[16px] font-bold text-foreground">Captured Posts</h3>
                <PostsFeed posts={account.posts ?? []} />
              </div>
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[16px] font-bold text-foreground">
                  Filings on Record
                  <span className="ml-2 text-[12px] font-medium text-muted-foreground">
                    ({filings.length})
                  </span>
                </h3>
                <FilingsList filings={filings as any} />
              </div>
            </>
          )}

          {/* IMPACT TAB */}
          {activeTab === 'impact' && (
            <>
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-1 text-[16px] font-bold text-foreground">Score History</h3>
                <p className="mb-4 text-[12px] text-muted-foreground">
                  Continuous trajectory from the public ledger.
                </p>
                {areaChartData.length >= 2 ? (
                  <D3AreaChart data={areaChartData} height={220} />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <TrendingUp size={28} className="text-muted-foreground/40" />
                    <p className="text-[13px] text-muted-foreground">No ledger entries yet.</p>
                  </div>
                )}
              </div>
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="text-[16px] font-bold text-foreground">Score Breakdown</h3>
                <p className="mt-1 text-[13px] text-muted-foreground mb-6">
                  Dimensions calculated from profile metrics.
                </p>
                <div className="py-2 flex justify-center">
                  <ScoreRadar breakdown={account.breakdown} />
                </div>
              </div>
            </>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
              <h3 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">
                Profile Overview
              </h3>
              {account.bio ? (
                <p className="text-[14px] leading-relaxed text-foreground mb-4">{account.bio}</p>
              ) : (
                <p className="text-[14px] leading-relaxed text-muted-foreground mb-4 italic">No bio provided.</p>
              )}
              {account.quote && (
                <blockquote className="border-l-2 border-primary pl-3 text-[14px] italic text-muted-foreground mb-4">
                  &quot;{account.quote}&quot;
                </blockquote>
              )}

              <div className="grid gap-3 text-[13px] text-foreground mt-6 break-words">
                {account.role && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Primary Role</span>
                    <span className="font-semibold sm:text-right">{account.role}</span>
                  </div>
                )}
                {account.region && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Location</span>
                    <span className="font-semibold sm:text-right">{account.region}</span>
                  </div>
                )}
                {account.educationWorkbook && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Education</span>
                    <span className="font-semibold sm:text-right capitalize">{account.educationWorkbook.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {account.specializedFieldWorkbook && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Specialized Field</span>
                    <span className="font-semibold sm:text-right capitalize">{account.specializedFieldWorkbook.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {account.managementWorkbook && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Management Scope</span>
                    <span className="font-semibold sm:text-right capitalize">{account.managementWorkbook.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {account.reach && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Reach</span>
                    <span className="font-semibold sm:text-right capitalize">{account.reach.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {account.followers && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Followers</span>
                    <span className="font-semibold sm:text-right">{account.followers}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                  <span className="text-muted-foreground shrink-0">Platform</span>
                  <span className="font-semibold sm:text-right">{formatPlatform(account.platform)}</span>
                </div>
                {socialLinks.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Linked Accounts</span>
                    <div className="flex flex-col sm:items-end gap-1.5 font-semibold">
                      {socialLinks.map(([platform, link]) => (
                        <a
                          key={platform}
                          href={link!.url}
                          className="hover:text-primary transition-colors flex items-center gap-1 break-all"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {formatPlatform(platform as any)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Similar Profiles — always visible */}
          <SimilarProfiles accounts={similarProfiles} />
        </div>
      </div>
    </main>
  );
}
