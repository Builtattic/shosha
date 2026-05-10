import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle2,
  Globe,
  MoreHorizontal,
  PieChart,
  Activity,
  Target,
  User,
  ArrowRight,
  Plus,
  Minus,
  ChevronLeft,
  AlertCircle,
  MapPin,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { DossierActions } from '@/components/profile/DossierActions';
import { FollowButton } from '@/components/profile/FollowButton';
import { FilingsList } from '@/components/profile/FilingsList';
import { PostsFeed } from '@/components/profile/PostsFeed';
import { ScoreRadar } from '@/components/viz/ScoreRadar';
import { SimilarProfiles } from '@/components/profile/SimilarProfiles';
import { AccountShareButton } from '@/components/profile/AccountShareButton';
import { LiveAccountScorePanel } from '@/components/profile/LiveAccountScorePanel';
import { ConnectionListModal } from '@/components/profile/ConnectionListModal';
import { ScoreLedgerPanel } from '@/components/profile/ScoreLedgerPanel';
import { ProfileImpactAnalytics } from '@/components/profile/ProfileImpactAnalytics';
import { formatPlatform, cn, formatRelativeTime } from '@/lib/utils';
import { idSchema } from '@/lib/validators';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import { getCurrentUserReadOnly, isAdmin } from '@/lib/auth';
import { hidesReporterOnPublicSurfaces } from '@/lib/reportPrivacy';
import { canViewProfileField, restrictedLabel, visibilityFor } from '@/lib/profilePrivacy';
import { profileDescription, profilePath, profileTitle, siteUrl } from '@/lib/seo';
import {
  getCachedAccountById,
  getCachedProfileBundle,
  type ReporterSummary
} from '@/lib/profileData';
import * as accountsRepo from '@/lib/repos/accounts';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return { title: 'Profile not found | Shosha', robots: { index: false, follow: false } };

  const account = await getCachedAccountById(id.data);
  if (!account) return { title: 'Profile not found | Shosha', robots: { index: false, follow: false } };

  const path = profilePath(account) || `/account/${account._id}`;
  const canonicalUrl = `${siteUrl()}${path}`;
  const title = profileTitle(account);
  const description = profileDescription(account);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'profile',
      images: account.avatarUrl ? [{ url: account.avatarUrl, alt: account.displayName }] : undefined,
    },
    twitter: {
      card: account.avatarUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: account.avatarUrl ? [account.avatarUrl] : undefined,
    },
  };
}

const TABS = [
  { id: 'overview', label: 'Overview', Icon: PieChart },
  { id: 'activity', label: 'Activity', Icon: Activity },
  { id: 'impact', label: 'Impact', Icon: Target },
  { id: 'about', label: 'About', Icon: User },
] as const;

const USER_SOCIAL_LINKS = [
  { platform: 'instagram', key: 'igUrl' },
  { platform: 'x', key: 'xUrl' },
  { platform: 'youtube', key: 'ytUrl' },
  { platform: 'linkedin', key: 'linkedinUrl' },
  { platform: 'facebook', key: 'fbUrl' },
  { platform: 'tiktok', key: 'tiktokUrl' },
  { platform: 'reddit', key: 'redditUrl' },
  { platform: 'snapchat', key: 'snapchatUrl' },
] as const;

function cleanDisplayValue(value?: string | null) {
  const text = String(value ?? '').trim();
  if (!text || ['unknown', 'platform user', 'registered'].includes(text.toLowerCase())) return '';
  return text;
}

function humanize(value?: string | null) {
  const text = cleanDisplayValue(value);
  return text ? text.replace(/_/g, ' ') : '';
}

function userRoleLabel(user: Awaited<ReturnType<typeof usersRepo.findById>>) {
  if (!user) return '';
  return cleanDisplayValue(user.headline)
    || cleanDisplayValue(user.category)
    || humanize(user.occupationRole)
    || '';
}

function userLocationLabel(user: Awaited<ReturnType<typeof usersRepo.findById>>) {
  if (!user) return '';
  const city = cleanDisplayValue(user.city);
  const country = cleanDisplayValue(user.country);
  if (city && country && !city.toLowerCase().includes(country.toLowerCase())) return `${city}, ${country}`;
  return city || country;
}

function normalizeExternalUrl(value?: string | null) {
  const text = cleanDisplayValue(value);
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function truncateText(value: string, limit = 60) {
  const normalized = value.trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function maskPhone(phone?: string, isOwnProfile = false) {
  const text = cleanDisplayValue(phone);
  if (!text) return '—';
  if (isOwnProfile) return text;
  const digits = text.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `••••••${digits.slice(-4)}`;
}

function compactUrlDisplay(url: string, max = 30) {
  const stripped = url.replace(/^https?:\/\//, '');
  if (stripped.length <= max) return stripped;
  return `${stripped.slice(0, max - 1)}…`;
}

function filingThumbnailUrl(filing: any) {
  return filing?.media?.thumbUrl || filing?.media?.url || filing?.evidenceSourceUrl || '';
}

function userSocialLinks(user: Awaited<ReturnType<typeof usersRepo.findById>>) {
  if (!user) return [];
  return USER_SOCIAL_LINKS
    .map(({ platform, key }) => {
      const url = normalizeExternalUrl(user[key]);
      return url ? [platform, { url }] as const : null;
    })
    .filter(Boolean) as Array<readonly [string, { url: string }]>;
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) notFound();

  let bundle = await getCachedProfileBundle(id.data);
  let account = bundle?.account ? { ...bundle.account } : null;
  if (!account) {
    const [platform, ...rest] = id.data.split('_');
    const username = rest.join('_');
    if (platform === 'website') {
      const { findByUsername } = await import('@/lib/repos/users');
      const user = await findByUsername(username);
      if (user) {
        // Profile views are read-only. If a website account exists under the
        // normalized safe ID, render it; otherwise require an explicit create
        // flow instead of writing data during navigation.
        const safeId = accountsRepo.deriveId('website', user.username);
        if (safeId !== id.data) {
          bundle = await getCachedProfileBundle(safeId);
          account = bundle?.account ? { ...bundle.account } : null;
        }
      } else {
        notFound();
      }
    } else {
      notFound();
    }
  }
  if (!account) notFound();
  if (!bundle) notFound();

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
      account.role = userRoleLabel(user) || account.role;
      account.followers = String((user.followers ?? []).length);
      
      // Inject the user's filed reports as "posts" to populate the feed
      const userReports = await reportsRepo.listByReporter(user._id);
      
      account.posts = userReports.filter((report) => !hidesReporterOnPublicSurfaces(report)).map(report => ({
        externalId: report._id,
        content: `Filed a ${report.type} report: ${report.deed || report.description || 'No description provided.'}`,
        likes: String(report.stats?.aligns ?? 0),
        replies: String(report.stats?.comments ?? 0),
        capturedAt: report.createdAt || new Date().toISOString()
      }));
    }
  }

  const filingsRaw = bundle.filingsRaw;
  const currentViewer = await getCurrentUserReadOnly().catch(() => null);
  const viewerIsAdmin = isAdmin(currentViewer);
  const isOwnProfile = Boolean(currentViewer && linkedUser && currentViewer._id === linkedUser._id);

  const isViewerFollowing = linkedUser
    ? (linkedUser.followers ?? []).includes(currentViewer?._id ?? '')
    : false;

  const canSeeLinkedLocation = canViewProfileField(linkedUser, currentViewer, 'location');
  const canSeeLinkedWebsite = canViewProfileField(linkedUser, currentViewer, 'website');
  const canSeeLinkedSocialLinks = canViewProfileField(linkedUser, currentViewer, 'socialLinks');
  const linkedUserRole = userRoleLabel(linkedUser);
  const linkedUserLocation = userLocationLabel(linkedUser);
  const linkedUserWebsiteUrl = normalizeExternalUrl(linkedUser?.websiteUrl);
  const overviewRole = linkedUserRole || humanize(account.role);
  const displayedRole = overviewRole || `${formatPlatform(account.platform)} dossier`;
  const displayedFollowers = linkedUser
    ? String((linkedUser.followers ?? []).length)
    : cleanDisplayValue(account.followers);
  const displayedLocation = linkedUser && canSeeLinkedLocation
    ? linkedUserLocation
    : linkedUser
      ? ''
      : cleanDisplayValue(account.region);
  const locationOverviewValue = linkedUser
    ? linkedUserLocation
      ? canSeeLinkedLocation ? linkedUserLocation : restrictedLabel(visibilityFor(linkedUser, 'location'))
      : 'Not provided'
    : cleanDisplayValue(account.region) || 'Not provided';
  const websiteOverviewValue = linkedUser
    ? linkedUserWebsiteUrl
      ? canSeeLinkedWebsite ? linkedUserWebsiteUrl : restrictedLabel(visibilityFor(linkedUser, 'website'))
      : 'Not provided'
    : normalizeExternalUrl(account.sourceUrl) || 'Not provided';

  const reporterMap = new Map<string, ReporterSummary>(
    bundle.reporters.map((reporter) => [reporter._id, reporter])
  );

  const filings = filingsRaw.map(f => ({
    ...f,
    anonymousTag: hidesReporterOnPublicSurfaces(f) ? 'Anonymous' : f.anonymousTag,
    reporter: !hidesReporterOnPublicSurfaces(f) && f.reporterId ? reporterMap.get(f.reporterId) : undefined
  }));

  // Real ledger history → derive deltas, total impact, weekly delta, area chart points
  const {
    history,
    delta,
    weeklyDelta,
    totalPositiveImpact,
    totalNegativeImpact,
    profileCredibility
  } = bundle.metrics;

  function formatImpact(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }

  const socialLinks = linkedUser
    ? canSeeLinkedSocialLinks ? userSocialLinks(linkedUser) : []
    : Object.entries(account.socialLinks ?? {}).filter(([, link]) => link?.url);
  const socialLinksRestricted = Boolean(linkedUser && !canSeeLinkedSocialLinks && userSocialLinks(linkedUser).length > 0);
  const windowScores = account.windowScores;

  // Similar profiles: same platform, exclude self, sort by score descending
  const similarProfiles = bundle.similarProfiles;

  const activeTab = searchParams.tab || 'overview';

  return (
    <main className="min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950 safe-bottom font-sans">
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
                credibility: profileCredibility,
                weeklyDelta,
                totalImpact: formatImpact(totalPositiveImpact),
                followers: displayedFollowers || '0',
                role: displayedRole,
                location: displayedLocation,
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start w-full min-w-0">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="relative h-16 w-16 shrink-0">
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
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[20px] font-bold text-foreground leading-tight sm:text-[22px] whitespace-nowrap">
                  {account.displayName.replace(/^@/, '')}
                </h1>
                {account.verified && (
                  <CheckCircle2 size={16} fill="currentColor" className="text-foreground shrink-0" />
                )}
              </div>
              <p className="text-[12px] text-muted-foreground sm:text-[13px]">
                @{account.username.replace(/^@/, '')}
              </p>
              <p className="text-[12px] text-muted-foreground capitalize sm:text-[13px]">
                {account.profileKind === 'public_figure'
                  ? 'Public Figure'
                  : displayedRole}
              </p>
              {displayedLocation && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <MapPin size={12} /> {displayedLocation}
                </p>
              )}
              {linkedUser && (
                <ConnectionListModal
                  targetUserId={linkedUser._id}
                  followingCount={(linkedUser.following ?? []).length}
                  followersCount={(linkedUser.followers ?? []).length}
                  className="mt-2"
                />
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
              targetName={account.displayName}
              targetHandle={account.username}
              targetAvatar={account.avatarUrl}
            />
          </div>
        </div>

        <LiveAccountScorePanel
          accountId={account._id}
          initial={{
            score: account.score,
            scoreHistory: account.scoreHistory,
            followers: displayedFollowers || account.followers,
            credibility: profileCredibility,
            createdAt: account.createdAt,
          }}
        />

        {windowScores && (
          <ScoreLedgerPanel
            windowScores={windowScores}
            globalScore={account.globalScore}
            viewerIsAdmin={viewerIsAdmin}
          />
        )}

        {/* Tabs */}
        <div className="mt-8 flex justify-between gap-2 overflow-x-auto whitespace-nowrap border-b border-border text-[13px] font-semibold text-muted-foreground no-scrollbar">
          {TABS.map(({ id: tabId, label, Icon }) => (
            <Link
              key={tabId}
              href={`?tab=${tabId}`}
              scroll={false}
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
              <div className="rounded-2xl bg-background p-4 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-bold text-foreground">Recent Activity</h3>
                  {filings.length > 0 && (
                    <Link
                      href="?tab=activity"
                      scroll={false}
                      className="text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      View all <ArrowRight size={14} />
                    </Link>
                  )}
                </div>

                {filings.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <AlertCircle size={28} className="text-muted-foreground/40" />
                    <p className="text-[13px] text-muted-foreground">No activity yet.</p>
                    <p className="max-w-xs text-[12px] text-muted-foreground/70">
                      File the first report on this dossier to populate the ledger.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {filings.slice(0, 4).map((filing: any) => {
                      const isPositive = filing.type === 'positive';
                      const filingTitle = truncateText(filing.deed || filing.title || filing.description || 'Filing recorded', 60);
                      const mediaUrl = filingThumbnailUrl(filing);
                      const score =
                        filing.adminDecision?.finalImpact ??
                        filing.aiVerdict?.proposedImpact ??
                        filing.reportScore ??
                        filing.baseScore ??
                        0;
                      return (
                        <div
                          key={filing._id}
                          className="flex items-center gap-3 py-3 first:pt-1 last:pb-1 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                        >
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                            {mediaUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className={cn(
                                'flex h-full w-full items-center justify-center',
                                isPositive ? 'text-primary' : 'text-destructive',
                              )}>
                                {isPositive ? <Plus size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
                              </div>
                            )}
                            {!mediaUrl && <ImageIcon size={10} className="absolute right-1 top-1 text-muted-foreground/70" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <span
                                className={cn(
                                  'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[20px] leading-none',
                                  isPositive
                                    ? 'bg-green-500/15 text-green-500'
                                    : 'bg-red-500/15 text-red-500',
                                )}
                                aria-hidden="true"
                              >
                                {isPositive ? '+' : '−'}
                              </span>
                              <h4 className="text-[15px] font-semibold text-foreground line-clamp-2 leading-snug">
                                {filingTitle}
                              </h4>
                            </div>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {filing.createdAt ? formatRelativeTime(new Date(filing.createdAt)) : 'Recent'}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-xl px-3 py-1.5 text-[20px] leading-none font-semibold tabular-nums',
                              isPositive
                                ? 'bg-green-500/15 text-green-500'
                                : 'bg-red-500/15 text-red-500',
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
                <div className="rounded-2xl border border-zinc-100 bg-background p-4 dark:border-zinc-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Filings
                  </p>
                  <p className="mt-1 text-[22px] font-black text-foreground tabular-nums">
                    {filings.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-background p-4 dark:border-zinc-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Positive impact
                  </p>
                  <p className="mt-1 text-[22px] font-black text-primary tabular-nums">
                    +{formatImpact(totalPositiveImpact)}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-background p-4 dark:border-zinc-800 col-span-2 sm:col-span-1">
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
              <ProfileImpactAnalytics
                showGraph
                showImpactDetails={false}
                history={history.map((entry: any) => ({
                  t: entry.t,
                  s: entry.s,
                  delta: entry.delta,
                  category: entry.category,
                  deed: entry.deed,
                }))}
                filings={filings.map((filing: any) => {
                  const score =
                    filing.adminDecision?.finalImpact ??
                    filing.aiVerdict?.proposedImpact ??
                    filing.reportScore ??
                    filing.baseScore ??
                    0;
                  return {
                    id: filing._id,
                    title: filing.deed || filing.description || 'Filing recorded',
                    category: filing.category || 'Uncategorized',
                    delta: score,
                    type: filing.type,
                    status: filing.status,
                    createdAt: filing.createdAt,
                    mediaUrl: filing.media?.url,
                    thumbUrl: filing.media?.thumbUrl,
                    evidenceSourceUrl: filing.evidenceSourceUrl,
                  };
                })}
              />
              <div className="rounded-2xl bg-background p-4 border border-zinc-100 dark:border-zinc-800">
                <h3 className="mb-4 text-[16px] font-bold text-foreground">Captured Posts</h3>
                <PostsFeed posts={account.posts ?? []} />
              </div>
              <div className="rounded-2xl bg-background p-4 border border-zinc-100 dark:border-zinc-800">
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
              <ProfileImpactAnalytics
                showGraph={false}
                showImpactDetails
                history={history.map((entry: any) => ({
                  t: entry.t,
                  s: entry.s,
                  delta: entry.delta,
                  category: entry.category,
                  deed: entry.deed,
                }))}
                filings={filings.map((filing: any) => {
                  const score =
                    filing.adminDecision?.finalImpact ??
                    filing.aiVerdict?.proposedImpact ??
                    filing.reportScore ??
                    filing.baseScore ??
                    0;
                  return {
                    id: filing._id,
                    title: filing.deed || filing.description || 'Filing recorded',
                    category: filing.category || 'Uncategorized',
                    delta: score,
                    type: filing.type,
                    status: filing.status,
                    createdAt: filing.createdAt,
                    mediaUrl: filing.media?.url,
                    thumbUrl: filing.media?.thumbUrl,
                    evidenceSourceUrl: filing.evidenceSourceUrl,
                  };
                })}
              />
              <div className="rounded-2xl bg-background p-4 border border-zinc-100 dark:border-zinc-800">
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
              <div className="rounded-2xl bg-background p-4 border border-zinc-100 dark:border-zinc-800">
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                  <span className="text-muted-foreground shrink-0">Primary Role</span>
                  <span className="font-semibold sm:text-right capitalize">{overviewRole || '—'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                  <span className="text-muted-foreground shrink-0">Location</span>
                  <span className="font-semibold sm:text-right">{locationOverviewValue}</span>
                </div>
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                  <span className="text-muted-foreground shrink-0">Followers</span>
                  <span className="font-semibold sm:text-right">{displayedFollowers || '—'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                  <span className="text-muted-foreground shrink-0">Platform</span>
                  <span className="font-semibold sm:text-right">{formatPlatform(account.platform)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                  <span className="text-muted-foreground shrink-0">Platform Website</span>
                  {websiteOverviewValue.startsWith('http') ? (
                    <a
                      href={websiteOverviewValue}
                      className="font-semibold sm:text-right hover:text-primary transition-colors break-all"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {websiteOverviewValue.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="font-semibold sm:text-right">{websiteOverviewValue}</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border pb-3 gap-1">
                  <span className="text-muted-foreground shrink-0">Phone</span>
                  <span className="font-semibold sm:text-right">{maskPhone(linkedUser?.phone || account.phone, isOwnProfile)}</span>
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
                          {formatPlatform(platform as any)} · {compactUrlDisplay(link!.url)}
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {socialLinksRestricted && (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-3 gap-1">
                    <span className="text-muted-foreground shrink-0">Linked Accounts</span>
                    <span className="font-semibold sm:text-right">{restrictedLabel(visibilityFor(linkedUser, 'socialLinks'))}</span>
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
