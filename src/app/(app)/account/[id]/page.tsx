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
import { FilingsList } from '@/components/profile/FilingsList';
import { PostsFeed } from '@/components/profile/PostsFeed';
import { ScoreGauge } from '@/components/viz/ScoreGauge';
import { ScoreRadar } from '@/components/viz/ScoreRadar';
import { D3AreaChart } from '@/components/viz/D3AreaChart';
import { SimilarProfiles } from '@/components/profile/SimilarProfiles';
import { AccountShareButton } from '@/components/profile/AccountShareButton';
import { formatPlatform, cn } from '@/lib/utils';
import { BASE_SCORE } from '@/lib/scoring';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
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
  if (!account) notFound();

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

  const [filings, allTop] = await Promise.all([
    reportsRepo.listForAccount(id.data, ['approved', 'ai_reviewed', 'flagged'], 30),
    accountsRepo.listAll(120).catch(() => []),
  ]);

  // Real ledger history → derive deltas, total impact, weekly delta, area chart points
  const history = account.scoreHistory?.length
    ? account.scoreHistory
    : [{ t: account.createdAt ?? new Date().toISOString(), s: account.score, cause: 'seed' as const }];

  const previous = history.length > 1 ? history[history.length - 2].s : BASE_SCORE;
  const delta = account.score - previous;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyDelta = history
    .filter((h: any) => h.t && new Date(h.t).getTime() >= weekAgo)
    .reduce((sum: number, h: any) => sum + (h.delta ?? 0), 0);

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
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Link
            href="/feed"
            aria-label="Back to feed"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[13px] font-bold text-foreground sm:text-[14px]">
              {account.displayName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">@{account.username}</p>
          </div>
          <div className="flex items-center gap-1">
            <AccountShareButton displayName={account.displayName} username={account.username} />
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

      <div className="mx-auto max-w-2xl px-4 mt-6">
        {/* Profile Info Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
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
                <h1 className="text-[20px] font-bold text-foreground leading-tight truncate sm:text-[22px]">
                  {account.displayName}
                </h1>
                {account.verified && (
                  <CheckCircle2 size={16} fill="currentColor" className="text-foreground shrink-0" />
                )}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground sm:text-[13px]">
                @{account.username}
              </p>
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
            </div>
          </div>

          {/* Action buttons row (Report / Claim / Audit) — full width on mobile */}
          <div className="sm:ml-auto sm:shrink-0">
            <DossierActions
              accountId={account._id}
              claimedBy={account.claimedBy}
              claimable={(account.claimable as boolean | undefined) !== false}
            />
          </div>
        </div>

        {/* Score Gauge Hero — properly centered */}
        <div className="mt-10 mb-6 flex justify-center">
          <ScoreGauge
            score={account.score}
            trending={delta >= 0 ? 'up' : 'down'}
            change={delta > 0 ? `+${delta}` : String(delta)}
          />
        </div>

        {/* 4 Stat Cards with REAL data */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* This Week */}
          <div className="rounded-[20px] border border-border bg-background p-3 shadow-sm">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full',
                weeklyDelta > 0
                  ? 'bg-green-50 text-green-600'
                  : weeklyDelta < 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {weeklyDelta > 0 ? (
                <TrendingUp size={14} strokeWidth={3} />
              ) : weeklyDelta < 0 ? (
                <TrendingDown size={14} strokeWidth={3} />
              ) : (
                <Minus size={14} strokeWidth={3} />
              )}
            </div>
            <p
              className={cn(
                'mt-3 text-[18px] font-black tabular-nums',
                weeklyDelta > 0 ? 'text-green-600' : weeklyDelta < 0 ? 'text-red-600' : 'text-foreground',
              )}
            >
              {weeklyDelta > 0 ? '+' : ''}
              {weeklyDelta.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">This Week</p>
          </div>

          {/* Total Positive Impact */}
          <div className="rounded-[20px] border border-border bg-background p-3 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Flame size={14} strokeWidth={3} />
            </div>
            <p className="mt-3 text-[18px] font-black tabular-nums text-foreground">
              {formatImpact(totalPositiveImpact)}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Total Impact</p>
          </div>

          {/* Followers */}
          <div className="rounded-[20px] border border-border bg-background p-3 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-foreground">
              <Users size={14} strokeWidth={2.5} />
            </div>
            <p className="mt-3 text-[18px] font-black tabular-nums text-foreground">
              {account.followers || '—'}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Followers</p>
          </div>

          {/* Credibility */}
          <div className="rounded-[20px] border border-border bg-background p-3 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-foreground">
              <Shield size={14} strokeWidth={2.5} />
            </div>
            <p className="mt-3 text-[18px] font-black tabular-nums text-foreground">
              {account.credibility ?? 80}%
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Credibility</p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground"
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
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-bold text-foreground">Recent Activity</h3>
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
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {filing.createdAt
                                ? new Date(filing.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Recent'}
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
              {account.bio && (
                <p className="text-[14px] leading-relaxed text-foreground mb-4">{account.bio}</p>
              )}
              {account.quote && (
                <blockquote className="border-l-2 border-primary pl-3 text-[14px] italic text-muted-foreground mb-4">
                  &quot;{account.quote}&quot;
                </blockquote>
              )}

              <div className="grid gap-3 text-[13px] text-foreground mt-6">
                {account.role && (
                  <div className="flex items-start justify-between border-b border-border pb-3">
                    <span className="text-muted-foreground">Primary Role</span>
                    <span className="font-semibold text-right">{account.role}</span>
                  </div>
                )}
                {account.region && (
                  <div className="flex items-start justify-between border-b border-border pb-3">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-semibold text-right">{account.region}</span>
                  </div>
                )}
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-semibold text-right">{formatPlatform(account.platform)}</span>
                </div>
                {socialLinks.length > 0 && (
                  <div className="flex items-start justify-between pb-3">
                    <span className="text-muted-foreground">Linked Accounts</span>
                    <div className="flex flex-col items-end gap-1.5 font-semibold">
                      {socialLinks.map(([platform, link]) => (
                        <a
                          key={platform}
                          href={link!.url}
                          className="hover:text-primary transition-colors flex items-center gap-1"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {formatPlatform(platform)}
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
