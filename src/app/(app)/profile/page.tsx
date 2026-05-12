'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2, Upload, TrendingUp, Shield,
  PieChart, Activity, Target, User, Users, ThumbsUp, ThumbsDown, Minus, ArrowRight,
  Briefcase, GraduationCap, FileText, Link2, Pencil, MapPin, ExternalLink,
  AlertCircle, Bell, Play, History, TrendingDown, Calendar, Eye, Link as LinkIcon
} from 'lucide-react';
import { useReportModal } from '@/components/report/ReportModalProvider';
import Link from 'next/link';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { calcProfileScores, calcShoshaScore, BASE_SCORE } from '@/lib/scoring';
import { calcCredibility } from '@/lib/credibility';
import { D3ProfileGauge } from '@/components/viz/D3ProfileGauge';
import { D3DonutChart } from '@/components/viz/D3DonutChart';
import { D3AreaChart } from '@/components/viz/D3AreaChart';
import { D3ActivityBar } from '@/components/viz/D3ActivityBar';
import { ProfileScoreRadar } from '@/components/viz/ProfileScoreRadar';
import { ShareCardModal } from '@/components/profile/ShareCardModal';
import { PostDetailModal } from '@/components/feed/PostDetailModal';
import { ConnectionListModal } from '@/components/profile/ConnectionListModal';
import { ClaimProfileSearchModal } from '@/components/profile/ClaimProfileSearchModal';


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

export default function ProfilePage() {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const reportModal = useReportModal();
  const [data, setData] = useState<{ user: any; claimedAccounts: any[]; recentEvents: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'impact' | 'about'>('overview');
  const [shareOpen, setShareOpen] = useState(false);
  const [claimSearchOpen, setClaimSearchOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [ledgerRange, setLedgerRange] = useState<'weekly' | 'monthly' | 'max'>('max');
  const initialReplayDone = useRef(false);

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const payload = res.ok ? await res.json() : null;
    if (payload?.ok) setData(payload.data);
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
  }, [loadProfile]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  const appUser = data?.user ?? null;
  const scores = appUser ? calcProfileScores(appUser) : [];
  const contextPercent = calcShoshaScore(scores); // 0–100 composite of profile multipliers
  // Credibility = completion + verification (max 80% from completion alone, +20% with Trust Badge).
  // Falls back to the live recompute when the persisted value isn't available.
  const credibility = appUser
    ? (typeof appUser.credibility === 'number' ? appUser.credibility : calcCredibility(appUser).total)
    : 0;
  const trustBadge = Boolean(appUser?.trustBadge);
  const ledgerScore = typeof appUser?.score === 'number' ? appUser.score : BASE_SCORE;
  const ledgerHistory: any[] = appUser?.scoreHistory ?? [];

  // Weekly Δ: sum of deltas in the last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyDeltaRaw = ledgerHistory
    .filter(h => h.t && new Date(h.t).getTime() >= weekAgo)
    .reduce((sum, h) => sum + (h.delta ?? 0), 0);
  const weeklyDelta = Number(weeklyDeltaRaw.toFixed(2));
  const positiveDeltaWeek = ledgerHistory
    .filter(h => h.t && new Date(h.t).getTime() >= weekAgo && h.delta > 0)
    .reduce((sum, h) => sum + h.delta, 0);
  const negativeDeltaWeek = ledgerHistory
    .filter(h => h.t && new Date(h.t).getTime() >= weekAgo && h.delta < 0)
    .reduce((sum, h) => sum + Math.abs(h.delta), 0);

  const totalPositiveImpact = ledgerHistory
    .filter(h => h.delta > 0)
    .reduce((sum, h) => sum + h.delta, 0);

  function formatNumberShort(num: number) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  }

  const followersCountStr = formatNumberShort((appUser?.followers ?? []).length);

  const displayName = (appUser?.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Unknown User').replace(/^@/, '');
  const username = appUser?.username || 'user';
  const rawAvatarUrl = appUser?.photoUrl ?? firebaseUser?.photoURL;
  const avatarUrl = (rawAvatarUrl && rawAvatarUrl !== 'null' && rawAvatarUrl !== 'undefined') 
    ? rawAvatarUrl 
    : `https://api.dicebear.com/9.x/initials/svg?seed=${displayName}&backgroundColor=1a1a1a&textColor=ffffff`;

  const recentEvents: any[] = data?.recentEvents ?? [];
  const positiveEvents = recentEvents.filter(e => (e.eventType ?? e.type) === 'positive');
  const negativeEvents = recentEvents.filter(e => (e.eventType ?? e.type) === 'negative');
  const neutralEvents = recentEvents.filter(e => !['positive', 'negative'].includes(e.eventType ?? e.type ?? ''));

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

  // Derived data for Impact tab
  const impactMap = new Map<string, number>();
  ledgerHistory.forEach(entry => {
    if (entry.category && entry.delta !== undefined) {
      const cat = entry.category.split('|')[0].trim();
      impactMap.set(cat, (impactMap.get(cat) || 0) + entry.delta);
    }
  });
  
  const categoryImpacts = Array.from(impactMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const impactColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];
  
  const chartData = categoryImpacts.map((cat, i) => ({
    label: cat.label,
    value: Math.abs(cat.value),
    color: impactColors[i % impactColors.length]
  }));

  function changeTabWithoutJump(id: typeof tabs[number]['id']) {
    const scrollY = window.scrollY;
    setActiveTab(id);
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0 }));
  }

  return (
    <main className="min-h-screen bg-background safe-bottom font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="font-serif text-[26px] font-black tracking-tight text-foreground">
            Sho<span className="font-normal italic text-muted-foreground">शा</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShareOpen(true)}
              className="text-foreground transition-opacity hover:opacity-70"
              aria-label="Share profile card"
            >
              <Upload size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

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

        {/* Claim Existing Profile entry — for users where someone else already made a profile of them */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight">Claim an Existing Profile</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Search a made profile of you and verify ownership.
              </p>
            </div>
          </div>
          <button
            onClick={() => setClaimSearchOpen(true)}
            className="shrink-0 rounded-full border border-border bg-background px-4 py-1.5 text-[12px] font-bold transition hover:bg-muted"
          >
            Claim
          </button>
        </div>

        {/* Profile Info */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
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
          <div className="flex shrink-0 items-center gap-2 mt-2">
            <button className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-[12px] font-semibold text-foreground shadow-sm hover:bg-muted transition-all">
              Following <Bell size={12} />
            </button>
          </div>
        </div>

        {/* Ledger Score Hero */}
        <div className="mt-8 relative flex flex-col items-center w-full">
          <div className="w-full max-w-[420px] relative">
            <D3ProfileGauge score={ledgerScore} minScore={-1000} maxScore={1000} size={420} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-7 sm:pb-8 pointer-events-none">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shosha Score</p>
              <h2 className="mt-1 text-[40px] sm:text-[46px] font-black leading-none text-foreground tabular-nums">
                {ledgerScore.toLocaleString()}
              </h2>
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

        {/* Stat Cards */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {/* Card 1 */}
          <div className="rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center">
            <div className={cn("mx-auto flex items-center justify-center", weeklyDelta >= 0 ? "text-green-500" : "text-red-500")}>
              {weeklyDelta >= 0 ? <TrendingUp size={18} strokeWidth={2.5} /> : <ThumbsDown size={18} strokeWidth={2.5} />}
            </div>
            <p className={cn("mt-1.5 text-[15px] sm:text-[17px] font-bold tabular-nums", weeklyDelta >= 0 ? "text-green-500" : "text-red-500")}>
              {weeklyDelta > 0 ? '+' : ''}{weeklyDelta}
            </p>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">This Week</p>
          </div>
          {/* Card 2 */}
          <div className="rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="mx-auto flex items-center justify-center text-red-500">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] sm:text-[17px] font-bold text-foreground tabular-nums">
              {formatNumberShort(totalPositiveImpact)}
            </p>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Impact</p>
          </div>
          {/* Card 3 */}
          <div className="rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="mx-auto flex items-center justify-center text-foreground">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] sm:text-[17px] font-bold text-foreground tabular-nums">
              {followersCountStr}
            </p>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Followers</p>
          </div>
          {/* Card 4 */}
          <div className="rounded-2xl border border-border bg-background py-3 px-1 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="mx-auto flex items-center justify-center text-foreground">
              <Shield size={18} strokeWidth={2.5} />
            </div>
            <p className="mt-1.5 text-[15px] sm:text-[17px] font-bold text-foreground tabular-nums">
              {credibility || '0'}%
            </p>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Credibility</p>
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
                  <h3 className="text-[16px] font-bold text-foreground">Recent Activity</h3>
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
                    {recentEvents.map(event => (
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
                          'flex w-full items-center justify-between rounded-[16px] bg-muted/30 p-4 border border-border/50',
                          'text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[12px] bg-muted border border-border/50 shadow-sm">
                            <img src={`https://picsum.photos/seed/${event._id}/120/120`} alt="" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                              <Play size={20} className="text-white fill-white" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[14px] font-bold text-foreground line-clamp-2">
                              {event.cause
                                || event.deed
                                || (event.category ? `${event.category} event` : null)
                                || event.eventType
                                || (event.description?.trim() ?? '').slice(0, 60)
                                || 'Report'}
                            </span>
                            <span className="text-[12px] text-muted-foreground">
                              {event.timestamp ? formatRelativeTime(new Date(event.timestamp)) : ''}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold shadow-sm",
                          event.impact > 0 ? "bg-green-50 text-green-600" : event.impact < 0 ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"
                        )}>
                          {event.impact > 0 ? '+' : ''}{event.impact}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-3 text-center">
                    <History size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">No recent events recorded.</p>
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

              {/* Breakdown */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[16px] font-bold text-foreground flex items-center gap-1.5">
                  Activity Breakdown <AlertCircle size={14} className="text-muted-foreground" />
                </h3>
                {recentEvents.length > 0 ? (
                  <>
                    <D3ActivityBar
                      positive={positiveEvents.length}
                      negative={negativeEvents.length}
                      neutral={neutralEvents.length}
                      height={8}
                    />
                    <div className="mt-5 grid grid-cols-3 gap-2 divide-x divide-border text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-green-500">
                          <ThumbsUp size={14} strokeWidth={2.5} />
                          <div className="text-[14px] font-bold text-foreground">{positiveEvents.length}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Positive</div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-red-500">
                          <ThumbsDown size={14} strokeWidth={2.5} />
                          <div className="text-[14px] font-bold text-foreground">{negativeEvents.length}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Negative</div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Minus size={14} strokeWidth={2.5} />
                          <div className="text-[14px] font-bold text-foreground">{neutralEvents.length}</div>
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
            <div className="space-y-4">
              {/* Impact Overview List */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-5 text-[16px] font-bold text-foreground">Impact Overview</h3>
                {categoryImpacts.length > 0 ? (
                  <div className="space-y-3">
                    {categoryImpacts.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: impactColors[i % impactColors.length] }} />
                          {cat.label}
                        </div>
                        <div className={cn(
                          "text-[14px] font-bold",
                          cat.value > 0 ? "text-green-500" : cat.value < 0 ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {cat.value > 0 ? '+' : ''}{cat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-3 text-center">
                    <PieChart size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">No impact categories to show yet.</p>
                  </div>
                )}
              </div>

              {/* Impact Categories Chart */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-6 text-[16px] font-bold text-foreground">Impact Categories</h3>
                {chartData.length > 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative">
                      <D3DonutChart data={chartData} width={240} height={240} innerRadius={80} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <div className="text-[28px] font-black text-foreground leading-none">{chartData.length}</div>
                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Categories</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                      {chartData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center gap-3 text-center">
                    <Activity size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">Chart will generate once you have impact entries.</p>
                  </div>
                )}
              </div>

              {/* Top Impactful Actions */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-bold text-foreground">Top Impactful Actions</h3>
                </div>
                {ledgerHistory.length > 0 ? (
                  <div className="space-y-3">
                    {[...ledgerHistory]
                      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                      .slice(0, 5)
                      .map((entry, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40">
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                              entry.delta > 0
                                ? 'bg-green-50 text-green-600'
                                : entry.delta < 0
                                ? 'bg-red-50 text-red-600'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {entry.delta > 0 ? (
                              <ThumbsUp size={14} strokeWidth={2.5} />
                            ) : entry.delta < 0 ? (
                              <ThumbsDown size={14} strokeWidth={2.5} />
                            ) : (
                              <Minus size={14} strokeWidth={2.5} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-bold leading-tight text-foreground line-clamp-2">
                              {entry.cause || 'Adjudicated Event'}
                            </h4>
                            {entry.category && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {entry.category.split('|')[0].trim()}
                              </p>
                            )}
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {entry.t ? formatDate(entry.t) : ''}
                            </p>
                          </div>
                          <div
                            className={cn(
                              'shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-bold',
                              entry.delta > 0
                                ? 'bg-green-50 text-green-600'
                                : entry.delta < 0
                                ? 'bg-red-50 text-red-600'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {entry.delta > 0 ? '+' : ''}{entry.delta}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-3 text-center">
                    <Target size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">No impactful actions yet.</p>
                  </div>
                )}
              </div>
            </div>
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

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                  <h3 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">
                    Social Links
                  </h3>
                  <div className="space-y-2">
                    {socialLinks.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted transition-colors"
                      >
                        <span className="text-[13px] font-semibold text-foreground">{link.label}</span>
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <span className="max-w-[160px] truncate">{link.url}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </div>
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
        credibility={credibility}
        weeklyDelta={weeklyDelta}
        totalImpact={positiveDeltaWeek > 0 ? `+${positiveDeltaWeek}` : String(positiveDeltaWeek)}
        followers={appUser?.networkSize ? (NETWORK_LABELS[appUser.networkSize] || appUser.networkSize) : '—'}
        role={appUser?.occupationRole ? (ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole) : undefined}
        location={[appUser?.city, appUser?.country].filter(Boolean).join(', ') || undefined}
        isVerified={Boolean(appUser?.onboardingComplete)}
        platform={appUser?.platform || 'website'}
        multipliers={{
          massiveAction: appUser?.massiveAction,
          people: appUser?.peopleMultiplier,
          reach: appUser?.reachMultiplier,
          impact: appUser?.impactMultiplier,
          credibility: appUser?.credibilityMultiplier,
          momentum: appUser?.momentumMultiplier,
          innovation: appUser?.innovationMultiplier,
          community: appUser?.communityMultiplier,
          resource: appUser?.resourceMultiplier,
          legacy: appUser?.legacyMultiplier,
        }}
      />
      <PostDetailModal
        open={reportDetailOpen}
        reportId={selectedReportId}
        onClose={() => {
          setReportDetailOpen(false);
          setSelectedReportId(null);
        }}
      />
      <ClaimProfileSearchModal
        open={claimSearchOpen}
        onClose={() => setClaimSearchOpen(false)}
      />
    </main>
  );
}
