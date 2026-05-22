'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2, TrendingUp, Shield, ShieldCheck,
  PieChart, Activity, Target, User, Users, UserRound, ThumbsUp, ThumbsDown, Minus, ArrowRight,
  Briefcase, GraduationCap, FileText, Link2, Pencil, MapPin, ExternalLink,
  AlertCircle, Play, History, TrendingDown, Calendar, Eye, Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { calcProfileScores, calcShoshaScore, BASE_SCORE } from '@/lib/scoring';
import { D3ProfileGauge } from '@/components/viz/D3ProfileGauge';
import { D3AreaChart } from '@/components/viz/D3AreaChart';
import { ProfileImpactAnalytics } from '@/components/profile/ProfileImpactAnalytics';
import { D3ActivityBar } from '@/components/viz/D3ActivityBar';
import { ProfileScoreRadar } from '@/components/viz/ProfileScoreRadar';
import { ShareCardModal } from '@/components/profile/ShareCardModal';
import { ConnectionListModal, type ConnectionListModalRef } from '@/components/profile/ConnectionListModal';
import { SwipeScoreBreakdownCard } from '@/components/profile/SwipeScoreBreakdownCard';
import { PostDetailModal } from '@/components/feed/PostDetailModal';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';


const EDU_LABELS: Record<string, string> = {
  no_formal: 'No Formal Education',
  school: 'School',
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
  doctorate_specialized: 'Doctorate / Specialized',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  unemployed: 'Unemployed',
  individual_contributor: 'Individual Contributor',
  manager: 'Manager',
  founder_business_owner: 'Founder / Business Owner',
  public_figure_influencer: 'Public Figure / Influencer',
  government_political: 'Government / Political',
};

const MGMT_LABELS: Record<string, string> = {
  none: 'No management',
  small_team_limited_control: 'Small team',
  moderate_responsibility: 'Moderate responsibility',
  large_team_major_decisions: 'Large team',
  organizational_institutional: 'Organizational / Institutional',
};

const NETWORK_LABELS: Record<string, string> = {
  none: 'No online network',
  '<1k': '< 1K followers',
  '1k-10k': '1K–10K followers',
  '10k-100k': '10K–100K followers',
  '100k-1m': '100K–1M followers',
  '1m-100m': '1M–100M followers',
  '100m+': '100M+ followers',
};

const SOCIAL_KEYS = [
  { key: 'igUrl', label: 'Instagram' },
  { key: 'xUrl', label: 'X / Twitter' },
  { key: 'ytUrl', label: 'YouTube' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'tiktokUrl', label: 'TikTok' },
  { key: 'redditUrl', label: 'Reddit' },
  { key: 'fbUrl', label: 'Facebook' },
  { key: 'snapchatUrl', label: 'Snapchat' },
] as const;

function normalizeExternalUrl(value?: string | null) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function safeCategoryEventLabel(category: unknown): string | null {
  if (typeof category !== 'string') return null;
  const t = category.trim();
  if (!t || t.toLowerCase() === 'undefined') return null;
  return `${t} event`;
}

function reportTypeLabel(event: { eventType?: string; type?: string }): string | null {
  const t = event.eventType ?? event.type;
  if (t === 'positive') return 'Positive report';
  if (t === 'negative') return 'Negative report';
  return null;
}

export default function ProfilePage() {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{
    user: any;
    claimedAccounts: any[];
    recentEvents: any[];
    swipeAggregate?: { score: number; aligns: number; opposes: number };
  } | null>(null);
  const [filingsData, setFilingsData] = useState<{
    filings: any[];
    history: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'impact' | 'about'>('overview');
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [ledgerRange, setLedgerRange] = useState<'weekly' | 'monthly' | 'max'>('max');
  const initialReplayDone = useRef(false);
  const initialFilingsDone = useRef(false);
  const connectionListModalRef = useRef<ConnectionListModalRef>(null);

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const payload = res.ok ? await res.json() : null;
    if (payload?.ok) setData(payload.data);
  }, []);

  const loadFilings = useCallback(async () => {
    const res = await fetch('/api/me/filings', { cache: 'no-store' });
    const payload = res.ok ? await res.json() : null;
    if (payload?.ok) setFilingsData(payload.data);
  }, []);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        if (!initialReplayDone.current) {
          initialReplayDone.current = true;
          await fetch('/api/me/score/replay', { method: 'POST' }).catch(() => null);
        }
        await loadProfile();
        if (!initialFilingsDone.current) {
          initialFilingsDone.current = true;
          await loadFilings();
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    refresh();
    const interval = window.setInterval(refresh, 15_000);
    const onFocus = () => refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadProfile, loadFilings]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  const { swipeAggregate = { score: 0, aligns: 0, opposes: 0 } } = data ?? {};
  const appUser = data?.user ?? null;
  // Reputation credibility comes from GET /api/me (calcProfileCredibility on the server).
  const profileCredibilityDisplay = typeof appUser?.profileCredibility === 'number'
    ? Math.round(appUser.profileCredibility)
    : 0;
  const scores = appUser ? calcProfileScores(appUser) : [];
  const contextPercent = calcShoshaScore(scores); // 0–100 composite of profile multipliers
  const trustBadge = Boolean(appUser?.trustBadge);
  const ledgerScore = typeof appUser?.score === 'number' ? appUser.score : BASE_SCORE;
  const gaugeDisplayScore = Math.max(-1000, Math.min(1000, ledgerScore));
  const ledgerHistory: any[] = appUser?.scoreHistory ?? [];

  // Weekly Δ: sum of deltas in the last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyDeltaRaw = ledgerHistory
    .filter(h => h.t && new Date(h.t).getTime() >= weekAgo)
    .reduce((sum, h) => sum + (h.delta ?? 0), 0);
  const weeklyDelta = Number(weeklyDeltaRaw.toFixed(2));

  const totalPositiveImpact = ledgerHistory
    .filter(h => typeof h.delta === 'number' && h.delta > 0)
    .reduce((sum, h) => sum + h.delta, 0);

  function formatNumberShort(num: number) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  }

  const followersCountStr = formatNumberShort((appUser?.followers ?? []).length);
  const followingCountTotal =
    (appUser?.following ?? []).length + (appUser?.followingAccounts ?? []).length;

  const displayName = (appUser?.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Unknown User').replace(/^@/, '');
  const username = appUser?.username || 'user';
  const rawAvatarUrl = appUser?.photoUrl ?? firebaseUser?.photoURL;
  const avatarUrl = (rawAvatarUrl && rawAvatarUrl !== 'null' && rawAvatarUrl !== 'undefined') 
    ? rawAvatarUrl 
    : `https://api.dicebear.com/9.x/initials/svg?seed=${displayName}&backgroundColor=1a1a1a&textColor=ffffff`;

  const recentEvents: any[] = data?.recentEvents ?? [];
  const filingsAbout = filingsData?.filings ?? [];
  const filingsPositiveCount = filingsAbout.filter((f) => f.type === 'positive').length;
  const filingsNegativeCount = filingsAbout.filter((f) => f.type === 'negative').length;
  const filingsNeutralCount = filingsAbout.filter(
    (f) => !['positive', 'negative'].includes(f.type ?? ''),
  ).length;

  // Cumulative ledger timeline built from actual ledger history (Score₀ = 1000)
  const sortedLedger = [...ledgerHistory]
    .filter(h => h.t)
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

  const creationTime = appUser?.createdAt ? new Date(appUser.createdAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Build the full cumulative score timeline
  const fullTimeline = sortedLedger.reduce<{ date: Date; value: number }[]>((acc, entry) => {
    const last = acc.length > 0 ? acc[acc.length - 1].value : BASE_SCORE;
    acc.push({ date: new Date(entry.t), value: last + (entry.delta ?? 0) });
    return acc;
  }, [{ date: creationTime, value: BASE_SCORE }]);

  // Calendar-aligned range thresholds
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const rangeThresholds: Record<typeof ledgerRange, number> = {
    weekly: startOfWeek.getTime(),
    monthly: startOfYear.getTime(),
    max: 0,
  };
  const threshold = rangeThresholds[ledgerRange];

  // Filter & stitch: keep points in range, prepend the interpolated value at the boundary
  let areaChartData = fullTimeline.filter(d => d.date.getTime() >= threshold);
  if (ledgerRange !== 'max' && areaChartData.length !== fullTimeline.length) {
    const pointBefore = [...fullTimeline].reverse().find(d => d.date.getTime() < threshold);
    if (pointBefore) {
      areaChartData = [{ date: new Date(threshold), value: pointBefore.value }, ...areaChartData];
    } else if (areaChartData.length <= 1) {
      areaChartData = [{ date: new Date(threshold), value: BASE_SCORE }, ...areaChartData];
    }
  }
  if (areaChartData.length < 2) {
    areaChartData = [
      { date: creationTime, value: BASE_SCORE },
      { date: now, value: ledgerScore },
    ];
  }

  const socialLinks = SOCIAL_KEYS
    .map(s => ({ label: s.label, url: appUser?.[s.key] as string | undefined }))
    .filter(s => s.url);
  const profileWebsiteUrl = normalizeExternalUrl(appUser?.websiteUrl ?? appUser?.website);

  const tabs = [
    { id: 'overview', label: 'Overview', Icon: PieChart },
    { id: 'activity', label: 'Activity', Icon: Activity },
    { id: 'impact', label: 'Impact', Icon: Target },
    { id: 'about', label: 'About', Icon: User },
  ] as const;

  function changeTabWithoutJump(id: typeof tabs[number]['id']) {
    const scrollY = window.scrollY;
    setActiveTab(id);
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0 }));
  }

  return (
    <main className="min-h-screen bg-background safe-bottom font-sans">
      <MobileAppHeader shareAction={() => setShareOpen(true)} />

      <div className="mx-auto max-w-2xl px-4">
        {/* Onboarding CTA banner */}
        {appUser && !appUser.onboardingComplete && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background p-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0 text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">
                Complete your profile to unlock your full Shosha Score.
              </p>
            </div>
            <Link
              href="/onboard"
              className="shrink-0 rounded-full bg-foreground px-4 py-1.5 text-[12px] font-bold text-background"
            >
              Complete
            </Link>
          </div>
        )}

        {/* /profile is always the signed-in user's own profile — no "claim" CTA here. */}

        {/* Profile Info */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="relative h-20 w-20 shrink-0 group">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-full bg-[#b5e5af] object-cover shadow-sm transition-opacity duration-300"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.opacity = '0';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div 
                className="absolute inset-0 items-center justify-center bg-primary/10 text-primary font-black text-2xl hidden rounded-full"
                style={{ display: 'none' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-foreground p-0.5 z-10">
                <CheckCircle2 size={14} fill="currentColor" className="text-background" />
              </div>
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[20px] font-bold text-foreground leading-none truncate">{displayName}</h1>
                <CheckCircle2 size={16} fill="currentColor" className="text-foreground shrink-0" />
              </div>
              {trustBadge && (
                <div className="mt-1 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-foreground" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Verified Identity
                  </span>
                </div>
              )}
              <p className="text-[13px] text-muted-foreground mt-1.5">@{username}</p>
              {appUser?.occupationRole && (
                <p className="text-[13px] text-muted-foreground mt-0.5">{ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole}</p>
              )}
              {(appUser?.city || appUser?.country) && (
                <p className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin size={12} /> {[appUser.city, appUser.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            {trustBadge ? (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground">
                <ShieldCheck size={13} className="shrink-0 text-foreground" />
                Trusted
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/trust-badge')}
                className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-all"
              >
                <ShieldCheck size={13} className="shrink-0" />
                <span className="truncate">Get Trust Badge</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push('/profile/edit')}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-[12px] font-semibold text-foreground shadow-sm hover:bg-muted transition-all"
            >
              <Pencil size={12} strokeWidth={2.5} />
              Edit Profile
            </button>
          </div>
        </div>

        {appUser?._id && (
          <ConnectionListModal
            ref={connectionListModalRef}
            targetUserId={appUser._id}
            followingCount={followingCountTotal}
            followersCount={(appUser.followers ?? []).length}
            showInlineTriggers={false}
          />
        )}

        {/* Ledger Score Hero */}
        <div className="mt-8 relative flex flex-col items-center w-full">
          <div className="w-full max-w-[420px] relative">
            <D3ProfileGauge score={ledgerScore} minScore={-99000} maxScore={101000} size={420} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-7 sm:pb-8 pointer-events-none">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shosha Score</p>
              <h2 className="mt-1 text-[40px] sm:text-[46px] font-black leading-none text-foreground tabular-nums">
                {gaugeDisplayScore.toLocaleString()}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Lifetime: {ledgerScore.toLocaleString()} pts
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold shadow-sm',
                    weeklyDelta > 0
                      ? 'bg-green-50 text-green-600'
                      : weeklyDelta < 0
                      ? 'bg-red-50 text-red-600'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {weeklyDelta > 0 ? <TrendingUp size={14} strokeWidth={3} /> : weeklyDelta < 0 ? <ThumbsDown size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
                  {weeklyDelta > 0 ? 'Trending up' : weeklyDelta < 0 ? 'Trending down' : 'Neutral'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-1 pb-4 border-b border-border" />

        {/* Stat Cards — 4 cards: This Week, Total Impact, Followers, Credibility */}
        <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {/* Card 1 — This Week */}
          <div className="min-w-0 rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center">
            <div className={cn("mx-auto flex items-center justify-center", weeklyDelta >= 0 ? "text-green-500" : "text-red-500")}>
              {weeklyDelta >= 0 ? <TrendingUp size={18} strokeWidth={2.5} /> : <ThumbsDown size={18} strokeWidth={2.5} />}
            </div>
            <p className={cn("mt-1.5 text-[15px] sm:text-[17px] font-bold tabular-nums", weeklyDelta >= 0 ? "text-green-500" : "text-red-500")}>
              {weeklyDelta > 0 ? '+' : ''}{weeklyDelta}
            </p>
            <p title="Net score impact from the last 7 days (positive + negative)" className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">This Week</p>
          </div>
          {/* Card 2 — Total Impact */}
          <div className="min-w-0 rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="mx-auto flex items-center justify-center text-red-500">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] sm:text-[17px] font-bold text-foreground tabular-nums">
              {formatNumberShort(totalPositiveImpact)}
            </p>
            <p title="Sum of all lifetime positive impact from reports" className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Impact</p>
          </div>
          {/* Card 3 — Followers (click → modal with Followers/Following tabs) */}
          <button
            type="button"
            disabled={!appUser?._id}
            onClick={() => connectionListModalRef.current?.open('followers')}
            aria-label="View your followers"
            className="min-w-0 w-full cursor-pointer rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
          >
            <div className="mx-auto flex items-center justify-center text-foreground">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] sm:text-[17px] font-bold text-foreground tabular-nums">
              {followersCountStr}
            </p>
            <p title="Number of followers on ShoSha" className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Followers</p>
          </button>
          {/* Card 4 — Credibility */}
          <div className="min-w-0 rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="mx-auto flex items-center justify-center text-foreground">
              {trustBadge ? (
                <ShieldCheck size={18} strokeWidth={2.5} className="text-foreground" />
              ) : (
                <Shield size={18} strokeWidth={2.5} />
              )}
            </div>
            <p className="mt-1.5 text-[15px] sm:text-[17px] font-bold text-foreground tabular-nums">
              {profileCredibilityDisplay}%
            </p>
            <p title="Profile trustworthiness based on completion and reporting reliability. Max 100." className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Credibility</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex justify-between gap-2 overflow-x-auto whitespace-nowrap border-b border-border text-[13px] font-semibold text-muted-foreground scrollbar-none">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => changeTabWithoutJump(id)}
              className={cn(
                'flex flex-col items-center gap-1.5 px-2 py-3 border-b-2 transition-colors',
                activeTab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent hover:text-foreground'
              )}
            >
              <Icon size={18} strokeWidth={activeTab === id ? 2.5 : 2} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6 mb-12">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-bold text-foreground">Recent Posts</h3>
                  {recentEvents.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => changeTabWithoutJump('activity')}
                      className="text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      View all &rarr;
                    </button>
                  ) : (
                    <span className="text-[12px] text-muted-foreground">View all &rarr;</span>
                  )}
                </div>
                {recentEvents.length > 0 ? (
                  <div className="space-y-3">
                    {recentEvents.map(event => {
                      const impact = typeof event.impact === 'number' ? event.impact : null;
                      const isPositive = (event.eventType ?? event.type) === 'positive' || (impact !== null && impact > 0);
                      const isNegative = (event.eventType ?? event.type) === 'negative' || (impact !== null && impact < 0);
                      const mediaUrl = event.media?.thumbUrl || event.media?.url;
                      const title =
                        (typeof event.deed === 'string' && event.deed.trim() && event.deed.trim().toLowerCase() !== 'undefined' && event.deed.trim().toLowerCase() !== 'null' ? event.deed.trim() : '') ||
                        (typeof event.cause === 'string' && event.cause.trim() && event.cause.trim().toLowerCase() !== 'undefined' && event.cause.trim().toLowerCase() !== 'null' ? event.cause.trim() : '') ||
                        safeCategoryEventLabel(event.category) ||
                        reportTypeLabel(event) ||
                        (typeof event.description === 'string' ? event.description.trim().slice(0, 60) : '') ||
                        'Report filed';
                      return (
                        <button
                          key={event._id}
                          type="button"
                          onClick={() => {
                            const id = event.reportId ?? event._id;
                            if (!id) return;
                            setSelectedReportId(id);
                            setReportDetailOpen(true);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-[16px] bg-muted/30 p-4 border border-border/50',
                            'text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[12px] bg-muted border border-border/50 shadow-sm">
                              {mediaUrl ? (
                                <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className={cn(
                                  'flex h-full w-full items-center justify-center',
                                  isPositive ? 'bg-green-50 text-green-600' : isNegative ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground',
                                )}>
                                  {isPositive ? <ThumbsUp size={22} strokeWidth={2.5} /> : isNegative ? <ThumbsDown size={22} strokeWidth={2.5} /> : <Minus size={22} strokeWidth={2.5} />}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-[14px] font-bold text-foreground line-clamp-2">{title}</span>
                              <span className={cn(
                                'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider',
                                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground',
                              )}>
                                {isPositive ? '+ Positive Impact' : isNegative ? '− Negative Impact' : 'Neutral'}
                              </span>
                              <span className="text-[12px] text-muted-foreground">
                                {event.timestamp ? formatRelativeTime(new Date(event.timestamp)) : ''}
                              </span>
                            </div>
                          </div>
                          {impact !== null ? (
                            <div className={cn(
                              'shrink-0 rounded-full px-3 py-1.5 text-[15px] font-black shadow-sm tabular-nums',
                              impact > 0 ? 'bg-green-50 text-green-600' : impact < 0 ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground',
                            )}>
                              {impact > 0 ? '+' : ''}{Math.round(impact)}
                            </div>
                          ) : (
                            <div className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold shadow-sm bg-muted text-muted-foreground tabular-nums">
                              —
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-3 text-center">
                    <History size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">No recent posts.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              {/* Ledger Timeline */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">Score History</h3>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
                    {([
                      { key: 'weekly' as const, label: '1W' },
                      { key: 'monthly' as const, label: '1M' },
                      { key: 'max' as const, label: 'All' },
                    ]).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setLedgerRange(key)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all',
                          ledgerRange === key
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {areaChartData.length >= 2 ? (
                  <D3AreaChart data={areaChartData} height={200} rangeMode={ledgerRange} />
                ) : (
                  <div className="py-10 flex flex-col items-center gap-3 text-center">
                    <TrendingUp size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">
                      No ledger entries yet. Adjudicated events will appear here.
                    </p>
                  </div>
                )}
              </div>

              {(swipeAggregate.aligns > 0 || swipeAggregate.opposes > 0) && (
                <SwipeScoreBreakdownCard swipeAggregate={swipeAggregate} totalScore={ledgerScore} />
              )}

              {/* Breakdown */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[16px] font-bold text-foreground flex items-center gap-1.5">
                  Activity Breakdown <AlertCircle size={14} className="text-muted-foreground" />
                </h3>
                {filingsAbout.length > 0 ? (
                  <>
                    <D3ActivityBar
                      positive={filingsPositiveCount}
                      negative={filingsNegativeCount}
                      neutral={filingsNeutralCount}
                      height={8}
                    />
                    <div className="mt-5 grid grid-cols-3 gap-2 divide-x divide-border text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-green-500">
                          <ThumbsUp size={14} strokeWidth={2.5} />
                          <div className="text-[14px] font-bold text-foreground">{filingsPositiveCount}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Positive</div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-red-500">
                          <ThumbsDown size={14} strokeWidth={2.5} />
                          <div className="text-[14px] font-bold text-foreground">{filingsNegativeCount}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Negative</div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Minus size={14} strokeWidth={2.5} />
                          <div className="text-[14px] font-bold text-foreground">{filingsNeutralCount}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Neutral</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-3 text-center">
                    <Target size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">No events to break down yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── IMPACT ── */}
          {activeTab === 'impact' && (
            <ProfileImpactAnalytics
              showGraph={false}
              showImpactDetails
              swipeAggregate={swipeAggregate}
              totalScore={ledgerScore}
              history={(filingsData?.history ?? []).map((entry: any) => ({
                t: entry.t,
                s: entry.s,
                delta: entry.delta,
                category: entry.category,
                deed: entry.deed,
              }))}
              filings={filingsData?.filings ?? []}
            />
          )}


          {/* ── ABOUT ── */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              {/* Bio */}
              {appUser?.bio && (
                <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                  <h3 className="mb-3 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">Bio</h3>
                  <p className="text-[14px] leading-relaxed text-foreground">{appUser.bio}</p>
                </div>
              )}

              {/* Basic Info */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">
                  Basic Info
                </h3>
                <dl className="space-y-3">
                  {appUser?.name && (
                    <div className="flex items-center justify-between">
                      <dt className="text-[13px] text-muted-foreground">Full Name</dt>
                      <dd className="text-[13px] font-semibold text-foreground">{appUser.name}</dd>
                    </div>
                  )}
                  {/* Username removed for standardization */}
                  {appUser?.dob && (
                    <div className="flex items-center justify-between">
                      <dt className="text-[13px] text-muted-foreground">Date of Birth</dt>
                      <dd className="text-[13px] font-semibold text-foreground">
                        {formatDate(appUser.dob)}
                      </dd>
                    </div>
                  )}
                  {(appUser?.city || appUser?.country) && (
                    <div className="flex items-center justify-between">
                      <dt className="text-[13px] text-muted-foreground">Location</dt>
                      <dd className="text-[13px] font-semibold text-foreground">
                        {[appUser.city, appUser.country].filter(Boolean).join(', ')}
                      </dd>
                    </div>
                  )}
                  {appUser?.phone && (
                    <div className="flex items-center justify-between">
                      <dt className="text-[13px] text-muted-foreground">Phone</dt>
                      <dd className="text-[13px] font-semibold text-foreground">{appUser.phone}</dd>
                    </div>
                  )}
                  {profileWebsiteUrl && (
                    <div className="flex items-center justify-between">
                      <dt className="text-[13px] text-muted-foreground">Website</dt>
                      <dd className="text-[13px] font-semibold text-foreground">
                        <a
                          href={profileWebsiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {profileWebsiteUrl.replace(/^https?:\/\//, '')}
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Career */}
              {(appUser?.occupationRole || appUser?.education || appUser?.managesMoneyPeopleSystem || appUser?.networkSize) && (
                <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                  <h3 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">
                    Career & Profile
                  </h3>
                  <dl className="space-y-3">
                    {appUser?.occupationRole && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted-foreground">Role</dt>
                        <dd className="text-[13px] font-semibold text-foreground">
                          {ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole}
                        </dd>
                      </div>
                    )}
                    {appUser?.education && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted-foreground">Education</dt>
                        <dd className="text-[13px] font-semibold text-foreground">
                          {EDU_LABELS[appUser.education] ?? appUser.education}
                        </dd>
                      </div>
                    )}
                    {appUser?.managesMoneyPeopleSystem && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted-foreground">Management</dt>
                        <dd className="text-[13px] font-semibold text-foreground">
                          {MGMT_LABELS[appUser.managesMoneyPeopleSystem] ?? appUser.managesMoneyPeopleSystem}
                        </dd>
                      </div>
                    )}
                    {appUser?.networkSize && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted-foreground">Network Size</dt>
                        <dd className="text-[13px] font-semibold text-foreground">
                          {NETWORK_LABELS[appUser.networkSize] ?? appUser.networkSize}
                        </dd>
                      </div>
                    )}
                    {appUser?.specializedField && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted-foreground">Specialization</dt>
                        <dd className="text-[13px] font-semibold text-foreground capitalize">
                          {appUser.specializedField.replace(/_/g, ' ')}
                        </dd>
                      </div>
                    )}
                    {appUser?.physicalIntellectualLimitations && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted-foreground">Limitations</dt>
                        <dd className="text-[13px] font-semibold text-foreground capitalize">
                          {appUser.physicalIntellectualLimitations.replace(/_/g, ' ')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Official Links — icon-only horizontal row */}
              {socialLinks.length > 0 && (
                <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                  <h3 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">
                    Official Links
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {socialLinks.map(link => (
                      <a
                        key={link.label}
                        href={normalizeExternalUrl(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.label}
                        aria-label={link.label}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all hover:bg-muted hover:scale-105 active:scale-95"
                      >
                        <span className="text-[14px] font-black">
                          {link.label === 'X / Twitter' ? '𝕏' : link.label.charAt(0)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!appUser?.bio && !appUser?.occupationRole && !appUser?.education && socialLinks.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-border bg-background p-8 text-center">
                  <p className="text-[13px] text-muted-foreground mb-3">No profile information yet.</p>
                  <Link
                    href="/onboard"
                    className="rounded-full bg-foreground px-5 py-2 text-[13px] font-bold text-background"
                  >
                    Complete Profile
                  </Link>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <ShareCardModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        displayName={displayName}
        username={username}
        avatarUrl={avatarUrl}
        ledgerScore={ledgerScore}
        credibility={profileCredibilityDisplay}
        weeklyDelta={weeklyDelta}
        totalImpact={formatNumberShort(totalPositiveImpact)}
        followers={appUser?.networkSize ? (NETWORK_LABELS[appUser.networkSize] || appUser.networkSize) : '—'}
        role={appUser?.occupationRole ? (ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole) : undefined}
        location={[appUser?.city, appUser?.country].filter(Boolean).join(', ') || undefined}
        isVerified={Boolean(appUser?.onboardingComplete)}
        platform={appUser?.platform || 'website'}
        oppositions={swipeAggregate.opposes}
        aligns={swipeAggregate.aligns}
        socialRegion={[appUser?.city, appUser?.country].filter(Boolean).join(', ') || undefined}
        socialRole={appUser?.occupationRole ? (ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole) : undefined}
        socialReach={appUser?.networkSize ? (NETWORK_LABELS[appUser.networkSize] ?? appUser.networkSize) : undefined}
        socialEducation={appUser?.education ? (EDU_LABELS[appUser.education] ?? appUser.education) : undefined}
        socialSpecializedField={
          appUser?.specializedField === 'no' ? 'None' :
          appUser?.specializedField === 'some_experience' ? 'Some Experience' :
          appUser?.specializedField === 'professional' ? 'Professional' :
          appUser?.specializedField === 'expert' ? 'Expert' :
          undefined
        }
        socialManagement={appUser?.managesMoneyPeopleSystem ? (MGMT_LABELS[appUser.managesMoneyPeopleSystem] ?? appUser.managesMoneyPeopleSystem) : undefined}
        socialTitle={appUser?.occupationRole ? (ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole) : undefined}
        socialLimitations={
          appUser?.physicalIntellectualLimitations === 'yes' ? 'Has Disability' :
          appUser?.physicalIntellectualLimitations === 'no' ? 'No Disability / No Limitations' :
          appUser?.physicalIntellectualLimitations === 'prefer_not_to_say' ? 'Prefers Not to Say' :
          undefined
        }
        dimensions={scores}
      />
      <PostDetailModal
        open={reportDetailOpen}
        reportId={selectedReportId}
        onClose={() => {
          setReportDetailOpen(false);
          setSelectedReportId(null);
        }}
      />
    </main>
  );
}
