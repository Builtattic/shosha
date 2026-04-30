'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2, Upload, MoreHorizontal, TrendingUp, Shield,
  PieChart, Activity, Target, User, ThumbsUp, ThumbsDown, Minus, ArrowRight,
  Briefcase, GraduationCap, FileText, Link2, Pencil, MapPin, ExternalLink,
  AlertCircle, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { calcProfileScores, calcShoshaScore, BASE_SCORE, BASE_IMPACTS } from '@/lib/scoring';
import { D3ProfileGauge } from '@/components/viz/D3ProfileGauge';
import { D3AreaChart } from '@/components/viz/D3AreaChart';
import { D3ActivityBar } from '@/components/viz/D3ActivityBar';
import { ProfileScoreRadar } from '@/components/viz/ProfileScoreRadar';
import { ShareCardModal } from '@/components/profile/ShareCardModal';

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

export default function ProfilePage() {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ user: any; claimedAccounts: any[]; recentEvents: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'impact' | 'about'>('overview');
  const [shareOpen, setShareOpen] = useState(false);

  async function recalculateScore() {
    setRecalculating(true);
    try {
      await fetch('/api/me/score/replay', { method: 'POST' });
      const res = await fetch('/api/me');
      const payload = res.ok ? await res.json() : null;
      if (payload?.ok) setData(payload.data);
    } finally {
      setRecalculating(false);
    }
  }

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.ok ? res.json() : null)
      .then(payload => {
        if (payload?.ok) setData(payload.data);
      })
      .finally(() => setLoading(false));
  }, []);

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
  const credibility = contextPercent;
  const ledgerScore = typeof appUser?.score === 'number' ? appUser.score : BASE_SCORE;
  const ledgerHistory: any[] = appUser?.scoreHistory ?? [];

  // Weekly Δ: sum of deltas in the last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyDelta = ledgerHistory
    .filter(h => h.t && new Date(h.t).getTime() >= weekAgo)
    .reduce((sum, h) => sum + (h.delta ?? 0), 0);
  const positiveDeltaWeek = ledgerHistory
    .filter(h => h.t && new Date(h.t).getTime() >= weekAgo && h.delta > 0)
    .reduce((sum, h) => sum + h.delta, 0);
  const negativeDeltaWeek = ledgerHistory
    .filter(h => h.t && new Date(h.t).getTime() >= weekAgo && h.delta < 0)
    .reduce((sum, h) => sum + Math.abs(h.delta), 0);

  const displayName = appUser?.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Unknown User';
  const username = appUser?.username || 'user';
  const avatarUrl = appUser?.photoUrl ?? firebaseUser?.photoURL ?? `https://api.dicebear.com/9.x/initials/svg?seed=${displayName}&backgroundColor=1a1a1a&textColor=ffffff`;

  const recentEvents: any[] = data?.recentEvents ?? [];
  const positiveEvents = recentEvents.filter(e => (e.eventType ?? e.type) === 'positive');
  const negativeEvents = recentEvents.filter(e => (e.eventType ?? e.type) === 'negative');
  const neutralEvents = recentEvents.filter(e => !['positive', 'negative'].includes(e.eventType ?? e.type ?? ''));

  // Cumulative ledger timeline built from actual ledger history (Score₀ = 1000)
  const sortedLedger = [...ledgerHistory]
    .filter(h => h.t)
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

  const creationTime = appUser?.createdAt ? new Date(appUser.createdAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const areaChartData = sortedLedger.length > 0
    ? sortedLedger.reduce<{ date: Date; value: number }[]>((acc, entry) => {
        const last = acc.length > 0 ? acc[acc.length - 1].value : BASE_SCORE;
        acc.push({ date: new Date(entry.t), value: last + (entry.delta ?? 0) });
        return acc;
      }, [{ date: creationTime, value: BASE_SCORE }])
    : [
        { date: creationTime, value: BASE_SCORE },
        { date: new Date(), value: ledgerScore }
      ];

  const socialLinks = SOCIAL_KEYS
    .map(s => ({ label: s.label, url: appUser?.[s.key] as string | undefined }))
    .filter(s => s.url);

  const tabs = [
    { id: 'overview', label: 'Overview', Icon: PieChart },
    { id: 'activity', label: 'Activity', Icon: Activity },
    { id: 'impact', label: 'Impact', Icon: Target },
    { id: 'about', label: 'About', Icon: User },
  ] as const;

  return (
    <main className="min-h-screen bg-[#fafafa] pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#fafafa]/80 px-4 py-4 backdrop-blur-xl">
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
            <button className="text-foreground transition-opacity hover:opacity-70">
              <MoreHorizontal size={24} strokeWidth={2.5} />
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

        {/* Profile Info */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-20 w-20 shrink-0">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-full bg-[#b5e5af] object-cover shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-[#fafafa] bg-foreground p-0.5">
                <CheckCircle2 size={16} fill="currentColor" className="text-background" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[22px] font-bold text-foreground leading-none truncate">{displayName}</h1>
                <CheckCircle2 size={16} fill="currentColor" className="text-foreground shrink-0" />
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">@{username}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[12px] font-medium text-muted-foreground items-center">
                {appUser?.occupationRole && (
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} />
                    {ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole}
                  </span>
                )}
                {(appUser?.city || appUser?.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {[appUser.city, appUser.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {appUser?.networkSize && (
                  <span>{NETWORK_LABELS[appUser.networkSize] ?? appUser.networkSize}</span>
                )}
                {appUser?.education && (
                  <span className="flex items-center gap-1">
                    <GraduationCap size={12} />
                    {EDU_LABELS[appUser.education] ?? appUser.education}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/profile/edit')}
            className="flex sm:shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-semibold text-foreground shadow-sm transition-all hover:bg-muted w-full sm:w-auto"
          >
            <Pencil size={14} /> Edit Profile
          </button>
        </div>

        {/* Ledger Score Hero */}
        <div className="mt-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Shosha Score</p>
          <h2 className="mt-1 text-[56px] font-black leading-none text-foreground tabular-nums">
            {ledgerScore.toLocaleString()}
          </h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[12px] font-bold',
                weeklyDelta > 0
                  ? 'bg-green-50 text-green-600'
                  : weeklyDelta < 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-[#f0f0f0] text-muted-foreground'
              )}
            >
              {weeklyDelta > 0 ? <TrendingUp size={12} strokeWidth={3} /> : weeklyDelta < 0 ? <ThumbsDown size={12} strokeWidth={3} /> : <Minus size={12} strokeWidth={3} />}
              {weeklyDelta > 0 ? '+' : ''}{weeklyDelta} this week
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#f0f0f0] px-3 py-1 text-[12px] font-bold text-foreground">
              Context {contextPercent || '–'}/100
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Base 1,000 · ledger never resets</p>
          <button
            onClick={recalculateScore}
            disabled={recalculating}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm transition-all hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw size={11} strokeWidth={2.5} className={recalculating ? 'animate-spin' : ''} />
            {recalculating ? 'Recalculating…' : 'Recalculate from history'}
          </button>
          <div className="mt-4 -mb-8">
            <D3ProfileGauge score={ledgerScore} minScore={0} maxScore={2000} size={340} />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-2xl border border-border bg-background p-3 text-center shadow-sm">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
            <p className="mt-2 text-[16px] font-bold text-foreground tabular-nums">+{positiveDeltaWeek}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">P (week)</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3 text-center shadow-sm">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ThumbsDown size={16} strokeWidth={2.5} />
            </div>
            <p className="mt-2 text-[16px] font-bold text-foreground tabular-nums">−{negativeDeltaWeek}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">N (week)</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3 text-center shadow-sm">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0f0] text-foreground">
              <Shield size={16} strokeWidth={2.5} />
            </div>
            <p className="mt-2 text-[16px] font-bold text-foreground">{credibility || '0'}%</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Credibility</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3 text-center shadow-sm">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0f0] text-foreground">
              <FileText size={16} strokeWidth={2.5} />
            </div>
            <p className="mt-2 text-[16px] font-bold text-foreground">{recentEvents.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Events Filed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex justify-between gap-2 overflow-x-auto whitespace-nowrap border-b border-border text-[13px] font-semibold text-muted-foreground scrollbar-none">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
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
            <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-[16px] font-bold text-foreground">
                    <PieChart size={16} /> Profile Score Radar
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    8 dimensions calculated from your profile. Hover each vertex for detail.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[20px] font-black leading-none text-foreground">
                    {contextPercent > 0 ? contextPercent : '–'}
                  </div>
                  <div className="text-[11px] font-bold text-muted-foreground">/ 100</div>
                </div>
              </div>

              {scores.length > 0 ? (
                <>
                  <div className="mt-6 rounded-2xl bg-[#fafafa] py-8 flex justify-center border border-border">
                    <ProfileScoreRadar dimensions={scores} size={380} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {scores.map(dim => (
                      <div key={dim.key} className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
                          <span className="flex items-center justify-center rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background">
                            {dim.key}
                          </span>
                          {dim.fullName}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {dim.levelLabel}{' '}
                          <span className="opacity-50">({dim.value})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-2xl bg-[#fafafa] py-12 flex flex-col items-center justify-center border border-border gap-3">
                  <PieChart size={32} className="text-muted-foreground opacity-30" />
                  <p className="text-[13px] text-muted-foreground">
                    Complete your profile to see dimension scores.
                  </p>
                  <Link
                    href="/onboard"
                    className="rounded-full bg-foreground px-5 py-2 text-[13px] font-bold text-background"
                  >
                    Complete Profile
                  </Link>
                </div>
              )}

              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Scores reflect profile context only — not intent or circumstances, which are assessed per event.
              </p>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === 'activity' && (
            <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-bold text-foreground">All Events</h3>
                <span className="text-[12px] text-muted-foreground">{recentEvents.length} total</span>
              </div>
              {recentEvents.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-center">
                  <FileText size={32} className="text-muted-foreground opacity-30" />
                  <p className="text-[13px] text-muted-foreground">No events filed yet.</p>
                  <Link
                    href="/dashboard"
                    className="rounded-full bg-foreground px-5 py-2 text-[13px] font-bold text-background"
                  >
                    File an Event
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event: any, i) => {
                    const type = event.eventType ?? event.type;
                    const isPositive = type === 'positive';
                    const isNegative = type === 'negative';
                    return (
                      <div
                        key={event._id || i}
                        className="flex items-start gap-3 rounded-xl border border-border p-3"
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            isPositive
                              ? 'bg-green-50 text-green-600'
                              : isNegative
                              ? 'bg-red-50 text-red-600'
                              : 'bg-[#f0f0f0] text-muted-foreground'
                          )}
                        >
                          {isPositive ? (
                            <ThumbsUp size={14} strokeWidth={2.5} />
                          ) : isNegative ? (
                            <ThumbsDown size={14} strokeWidth={2.5} />
                          ) : (
                            <Minus size={14} strokeWidth={2.5} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-bold leading-tight text-foreground line-clamp-2">
                            {event.title || event.description || 'Event'}
                          </h4>
                          {event.description && event.title && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {event.timestamp
                              ? new Date(event.timestamp).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Unknown date'}
                          </p>
                        </div>
                        {event.impact != null && (
                          <div
                            className={cn(
                              'shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-bold',
                              isPositive
                                ? 'bg-green-50 text-green-600'
                                : isNegative
                                ? 'bg-red-50 text-red-600'
                                : 'bg-[#f0f0f0] text-muted-foreground'
                            )}
                          >
                            {event.impact > 0 ? '+' : ''}{event.impact}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── IMPACT ── */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              {/* Breakdown */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[16px] font-bold text-foreground">Activity Breakdown</h3>
                {recentEvents.length > 0 ? (
                  <>
                    <D3ActivityBar
                      positive={positiveEvents.length}
                      negative={negativeEvents.length}
                      neutral={neutralEvents.length}
                      height={10}
                    />
                    <div className="mt-5 grid grid-cols-3 gap-2 divide-x divide-border text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-500">
                          <ThumbsUp size={14} strokeWidth={2.5} />
                        </div>
                        <div className="mt-1 text-[15px] font-bold text-foreground">{positiveEvents.length}</div>
                        <div className="text-[11px] text-muted-foreground">Positive</div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500">
                          <ThumbsDown size={14} strokeWidth={2.5} />
                        </div>
                        <div className="mt-1 text-[15px] font-bold text-foreground">{negativeEvents.length}</div>
                        <div className="text-[11px] text-muted-foreground">Negative</div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Minus size={14} strokeWidth={2.5} />
                        </div>
                        <div className="mt-1 text-[15px] font-bold text-foreground">{neutralEvents.length}</div>
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

              {/* Ledger Timeline */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-1 text-[16px] font-bold text-foreground">Score Ledger</h3>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  Continuous trajectory from filed events. Base 1,000.
                </p>
                {areaChartData.length >= 2 ? (
                  <D3AreaChart data={areaChartData} color="#1a1a1a" height={200} />
                ) : (
                  <div className="py-10 flex flex-col items-center gap-3 text-center">
                    <TrendingUp size={28} className="text-muted-foreground opacity-30" />
                    <p className="text-[13px] text-muted-foreground">
                      No ledger entries yet. Adjudicated events will appear here.
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Δ entries */}
              {ledgerHistory.length > 0 && (
                <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                  <h3 className="mb-4 text-[16px] font-bold text-foreground">Recent Δ Entries</h3>
                  <div className="space-y-2">
                    {[...ledgerHistory].reverse().slice(0, 8).map((entry: any, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground capitalize">
                            {entry.cause}{entry.category ? ` · ${entry.category.replace(/_/g, ' ')}` : ''}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {entry.t ? new Date(entry.t).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-bold tabular-nums',
                            entry.delta > 0 ? 'bg-green-50 text-green-600' : entry.delta < 0 ? 'bg-red-50 text-red-600' : 'bg-[#f0f0f0] text-muted-foreground'
                          )}
                        >
                          {entry.delta > 0 ? '+' : ''}{entry.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scoring Formula Reference */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-1 text-[16px] font-bold text-foreground">How scoring works</h3>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  Δ = BaseImpact × (IY × P × M × E × AW × AB × C × RY × IN × RP) / 10
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(BASE_IMPACTS) as Array<keyof typeof BASE_IMPACTS>).map(k => {
                    const item = BASE_IMPACTS[k];
                    const isPositive = item.type === 'positive';
                    return (
                      <div key={k} className="flex items-center justify-between rounded-xl border border-border p-2.5">
                        <span className="text-[12px] font-semibold text-foreground">{item.label}</span>
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums',
                            isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                          )}
                        >
                          {item.value > 0 ? '+' : ''}{item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Multipliers run 0.5–3.0. Score never resets. Weekly momentum applies a decay/growth factor on Sundays.
                </p>
              </div>
            </div>
          )}

          {/* ── ABOUT ── */}
          {activeTab === 'about' && (
            <div className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <dt className="text-[13px] text-muted-foreground">Username</dt>
                    <dd className="text-[13px] font-semibold text-foreground">@{username}</dd>
                  </div>
                  {appUser?.dob && (
                    <div className="flex items-center justify-between">
                      <dt className="text-[13px] text-muted-foreground">Date of Birth</dt>
                      <dd className="text-[13px] font-semibold text-foreground">
                        {new Date(appUser.dob).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
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
              {!appUser?.occupationRole && !appUser?.education && socialLinks.length === 0 && (
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
        eventsCount={recentEvents.length}
        dimensions={scores}
        recentEvents={recentEvents}
        role={appUser?.occupationRole ? (ROLE_LABELS[appUser.occupationRole] ?? appUser.occupationRole) : undefined}
        location={[appUser?.city, appUser?.country].filter(Boolean).join(', ') || undefined}
        isVerified={Boolean(appUser?.onboardingComplete)}
      />
    </main>
  );
}
