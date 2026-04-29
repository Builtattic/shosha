'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, CheckCircle2, ChevronRight, Activity, Search,
  MapPin, Calendar, GraduationCap, Users, Briefcase, Link2,
  Instagram, Youtube, Facebook, Linkedin, Twitter, ExternalLink,
  UserCog, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { calcProfileScores, calcShoshaScore } from '@/lib/scoring';
import type { DimensionScore } from '@/lib/scoring';
import { ProfileScoreRadar } from '@/components/viz/ProfileScoreRadar';

// ── Label helpers ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  student: 'Student', unemployed: 'Unemployed',
  individual_contributor: 'Individual Contributor',
  manager: 'Manager', founder_business_owner: 'Founder / Business Owner',
  public_figure_influencer: 'Public Figure / Influencer',
  government_political: 'Government / Political Role',
};

const NETWORK_LABELS: Record<string, string> = {
  none: 'No network', '<1k': '< 1K followers', '1k-10k': '1K – 10K',
  '10k-100k': '10K – 100K', '100k-1m': '100K – 1M',
  '1m-100m': '1M – 100M', '100m+': '100M+',
};

const EDU_LABELS: Record<string, string> = {
  no_formal: 'No Formal Education', school: 'School',
  undergraduate: 'Undergraduate', postgraduate: 'Postgraduate',
  doctorate_specialized: 'Doctorate / Specialized',
};

// ── Social link row ────────────────────────────────────────────────────────────

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {icon}
      <span className="truncate">{label}</span>
      <ExternalLink size={10} className="shrink-0 opacity-50" />
    </a>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<{ user: any; claimedAccounts: any[]; recentEvents: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  const appUser = data?.user ?? null;
  const hasOnboarded = !!appUser?.onboardingComplete;
  const scores: DimensionScore[] = appUser ? calcProfileScores(appUser) : [];
  const shoshaScore = calcShoshaScore(scores);

  const hasSocials = !!(
    appUser?.igUrl || appUser?.tiktokUrl || appUser?.xUrl ||
    appUser?.linkedinUrl || appUser?.redditUrl || appUser?.ytUrl ||
    appUser?.fbUrl || appUser?.snapchatUrl
  );

  const displayName = appUser?.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Anonymous';
  const username = appUser?.username || 'user';
  const avatarSeed = displayName;

  return (
    <main className="min-h-screen bg-background pb-28">

      {/* ── Profile Header ────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border pt-10 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Avatar */}
            <div className="relative shrink-0">
              <img
                src={firebaseUser?.photoURL ?? `https://api.dicebear.com/9.x/initials/svg?seed=${avatarSeed}&backgroundColor=1a1a1a&textColor=ffffff`}
                alt="Profile"
                className="w-20 h-20 rounded-2xl border border-border bg-muted object-cover"
              />
              {appUser?.role === 'admin' && (
                <div className="absolute -top-2 -right-2 bg-foreground text-background text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-background tracking-wider">
                  ADMIN
                </div>
              )}
            </div>

            {/* Name / username / meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className="text-2xl font-black tracking-tight">{displayName}</h1>
                {hasOnboarded && <CheckCircle2 size={16} className="text-foreground shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground mb-2">@{username}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                {appUser?.dob && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date().getFullYear() - new Date(appUser.dob).getFullYear()} yrs
                  </span>
                )}
                {appUser?.networkSize && appUser.networkSize !== 'none' && (
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {NETWORK_LABELS[appUser.networkSize] ?? appUser.networkSize}
                  </span>
                )}
                {appUser?.education && (
                  <span className="flex items-center gap-1">
                    <GraduationCap size={12} />
                    {EDU_LABELS[appUser.education] ?? appUser.education}
                  </span>
                )}
              </div>
            </div>

            {/* Edit profile link */}
            <Link
              href="/onboard"
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 hover:bg-muted transition-colors"
            >
              <UserCog size={14} /> Edit Profile
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-6 flex flex-wrap gap-6 border-t border-border pt-5">
            {/* Shosha Score — composite of all 8 dims */}
            {shoshaScore > 0 && (
              <>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-black">{shoshaScore}</span>
                    <Sparkles size={13} className="text-muted-foreground" />
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Shosha Score</div>
                </div>
                <div className="w-px bg-border" />
              </>
            )}
            <div className="text-center">
              <div className="text-xl font-black">{appUser?.reporterScore ?? 50}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Credibility</div>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <div className="text-xl font-black">{data?.recentEvents?.length ?? 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Events Filed</div>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <div className="text-xl font-black">{data?.claimedAccounts?.length ?? 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Accounts</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* ── Incomplete profile CTA ─────────────────────────────────────── */}
        {!hasOnboarded && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-sm">Complete your profile</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in your details to unlock your influence scores and build your reputation on the ledger.
              </p>
            </div>
            <Link
              href="/onboard"
              className="shrink-0 rounded-xl bg-foreground text-background text-xs font-bold px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              Set up profile →
            </Link>
          </div>
        )}

        {/* ── Profile Score Radar ─────────────────────────────────────────── */}
        {scores.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Sparkles size={15} /> Profile Score Radar
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  8 dimensions calculated from your profile. Hover each vertex for detail.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black">{shoshaScore}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">/ 100</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 flex justify-center">
              <ProfileScoreRadar dimensions={scores} size={340} />
            </div>

            {/* Dimension legend */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {scores.map((dim) => (
                <div key={dim.key} className="rounded-xl border border-border bg-card px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono font-black text-[10px] bg-foreground text-background px-1 py-0.5 rounded-sm">{dim.key}</span>
                    <span className="text-xs font-semibold truncate">{dim.fullName}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{dim.levelLabel} <span className="opacity-50">({dim.value})</span></p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Scores reflect profile context only — not intent or circumstances, which are assessed per event.
            </p>
          </section>
        )}

        {/* ── Social Links ───────────────────────────────────────────────── */}
        {hasSocials && (
          <section>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Link2 size={16} /> Online Presence
            </h2>
            <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-2 gap-3">
              <SocialLink href={appUser?.igUrl} icon={<Instagram size={14} />} label="Instagram" />
              <SocialLink href={appUser?.tiktokUrl} icon={<span className="text-xs font-black w-3.5">TT</span>} label="TikTok" />
              <SocialLink href={appUser?.xUrl} icon={<Twitter size={14} />} label="X / Twitter" />
              <SocialLink href={appUser?.linkedinUrl} icon={<Linkedin size={14} />} label="LinkedIn" />
              <SocialLink href={appUser?.redditUrl} icon={<span className="text-xs font-bold w-3.5">R/</span>} label="Reddit" />
              <SocialLink href={appUser?.ytUrl} icon={<Youtube size={14} />} label="YouTube" />
              <SocialLink href={appUser?.fbUrl} icon={<Facebook size={14} />} label="Facebook" />
              <SocialLink href={appUser?.snapchatUrl} icon={<span className="text-xs font-black w-3.5">SC</span>} label="Snapchat" />
            </div>
          </section>
        )}

        {/* ── Claimed Accounts ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Shield size={16} /> Claimed Accounts
            </h2>
          </div>
          {data?.claimedAccounts && data.claimedAccounts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.claimedAccounts.map((acc: any) => (
                <Link key={acc._id} href={`/account/${acc._id}`}>
                  <div className="p-4 rounded-2xl border border-border bg-card hover:shadow-sm transition-shadow flex items-center gap-3 group">
                    <img src={acc.avatarUrl} alt={acc.displayName} className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm flex items-center gap-1 truncate">
                        {acc.displayName}
                        {acc.verified && <CheckCircle2 size={12} className="text-foreground shrink-0" />}
                      </h3>
                      <p className="text-xs text-muted-foreground">@{acc.username}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5">Score {acc.score}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                You haven&apos;t claimed any social accounts yet.
              </p>
              <Link
                href="/dashboard"
                className="inline-block rounded-xl bg-foreground px-5 py-2 text-xs font-bold text-background"
              >
                Find &amp; claim my account
              </Link>
            </div>
          )}
        </section>

        {/* ── Recent Filings ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Activity size={16} /> Recent Filings
            </h2>
            <Link href="/dashboard" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              File New Event →
            </Link>
          </div>

          {data?.recentEvents && data.recentEvents.length > 0 ? (
            <div className="space-y-3">
              {data.recentEvents.map((event: any) => (
                <div key={event._id} className="p-4 rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                      event.eventType === 'positive'
                        ? 'bg-foreground/10 text-foreground'
                        : 'bg-red-500/10 text-red-600'
                    )}>
                      {event.eventType}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">→ {event.subjectId}</span>
                  </div>
                  <p className="text-sm font-medium">{event.description}</p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                    <span className="capitalize px-2 py-0.5 bg-muted rounded-full font-semibold">{event.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-border">
              <Search size={20} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No events filed yet.</p>
              <Link href="/dashboard" className="text-xs font-semibold hover:underline mt-1 inline-block">
                Start investigating
              </Link>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
