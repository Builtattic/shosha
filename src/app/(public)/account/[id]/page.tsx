import { notFound } from 'next/navigation';
import { CheckCircle2, TrendingUp, TrendingDown, Shield, Users, Lock, Unlock, Minus, Flame, Globe, Upload, MoreHorizontal, Bell, PieChart, Activity, Target, User, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { DossierActions } from '@/components/profile/DossierActions';
import { FilingsList } from '@/components/profile/FilingsList';
import { PostsFeed } from '@/components/profile/PostsFeed';
import { ScoreGauge } from '@/components/viz/ScoreGauge';
import { ScoreHistory } from '@/components/viz/ScoreHistory';
import { ScoreRadar } from '@/components/viz/ScoreRadar';
import { formatPlatform, cn } from '@/lib/utils';
import { BASE_SCORE } from '@/lib/scoring';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import { enrichPublicProfileDetails, needsProfileEnrichment } from '@/lib/profileEnrichment';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ params, searchParams }: { params: { id: string }, searchParams: { tab?: string } }) {
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
        evidenceSummary: 'Gemini profile enrichment failed. Try again later.'
      })) ?? account;
    }
  }

  const filings = await reportsRepo.listForAccount(id.data, ['approved', 'ai_reviewed', 'flagged'], 30);

  const history = account.scoreHistory?.length
    ? account.scoreHistory
    : [{ t: account.createdAt ?? new Date().toISOString(), s: account.score, cause: 'seed' as const }];
  const previous = history.length > 1 ? history[history.length - 2].s : BASE_SCORE;
  const delta = account.score - previous;
  const socialLinks = Object.entries(account.socialLinks ?? {}).filter(([, link]) => link?.url);

  const activeTab = searchParams.tab || 'overview';

  return (
    <main className="min-h-screen bg-[#fafafa] pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#fafafa]/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="font-serif text-[26px] font-black tracking-tight text-foreground">
            Sho<span className="font-normal italic text-muted-foreground">शा</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-foreground transition-opacity hover:opacity-70">
              <Upload size={22} strokeWidth={2.5} />
            </button>
            <button className="text-foreground transition-opacity hover:opacity-70">
              <MoreHorizontal size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 mt-6">
        {/* Profile Info Row */}
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 shrink-0">
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt={account.displayName} className="h-full w-full rounded-full object-cover border border-border bg-[#b5e5af]" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full border border-border bg-muted font-serif text-3xl text-muted-foreground">
                {account.displayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {account.verified && (
              <div className="absolute bottom-0 right-0 rounded-full border-[3px] border-[#fafafa] bg-foreground text-background p-0.5">
                <CheckCircle2 size={16} fill="currentColor" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[22px] font-bold text-foreground leading-none truncate">{account.displayName}</h1>
              <CheckCircle2 size={18} fill="currentColor" className="text-foreground shrink-0" />
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">@{account.username}</p>
            <p className="text-[13px] text-muted-foreground capitalize">
              {account.profileKind === 'public_figure' ? 'Public Figure' : account.role || `${formatPlatform(account.platform)} dossier`}
            </p>
            {account.region && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                <Globe size={12} /> {account.region}
              </div>
            )}
          </div>
          <div className="pt-1 shrink-0">
            {/* Action Button matching the design */}
            {(account.claimable as boolean | undefined) !== false ? (
              <DossierActions accountId={account._id} claimedBy={account.claimedBy} claimable={(account.claimable as boolean | undefined) !== false} />
            ) : (
              <button className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-[13px] font-bold text-foreground shadow-sm transition-hover hover:bg-muted">
                Following <Bell size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Score Gauge Hero */}
        <div className="mt-12 mb-8">
          <ScoreGauge score={account.score} trending={delta >= 0 ? 'up' : 'down'} change={delta > 0 ? `+${delta}` : String(delta)} />
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* This Week (Delta) */}
          <div className="relative overflow-hidden rounded-[20px] border border-border bg-background p-3 flex flex-col h-[110px] shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-500 mb-auto">
              <TrendingUp size={14} strokeWidth={3} />
            </div>
            <div className="z-10 pb-1">
              <p className="text-[18px] font-black text-green-500">{delta > 0 ? `+${delta}` : delta}</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">This Week</p>
            </div>
            <svg className="absolute bottom-0 left-0 right-0 h-10 w-full opacity-60" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0,20 L10,16 L20,18 L30,12 L40,15 L50,8 L60,10 L70,5 L80,7 L90,2 L100,0" fill="none" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
            </svg>
          </div>

          {/* Total Impact */}
          <div className="relative overflow-hidden rounded-[20px] border border-border bg-background p-3 flex flex-col h-[110px] shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 mb-auto">
              <Flame size={14} strokeWidth={3} />
            </div>
            <div className="z-10 pb-1">
              {/* Fake impact stat for visuals, fallback to a derived stat */}
              <p className="text-[18px] font-black text-foreground">
                {account.score > 1000 ? ((account.score - 1000) * 1.5 / 1000).toFixed(1) + 'M' : '1.2K'}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Total Impact</p>
            </div>
            <svg className="absolute bottom-0 left-0 right-0 h-10 w-full opacity-60" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0,20 L10,18 L20,19 L30,15 L40,17 L50,12 L60,14 L70,10 L80,12 L90,14 L100,10" fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
            </svg>
          </div>

          {/* Followers */}
          <div className="relative overflow-hidden rounded-[20px] border border-border bg-background p-3 flex flex-col h-[110px] shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/50 text-foreground mb-auto">
              <Users size={14} strokeWidth={2.5} />
            </div>
            <div className="z-10 pb-1">
              <p className="text-[18px] font-black text-foreground">{account.followers || '0'}</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Followers</p>
            </div>
          </div>

          {/* Credibility */}
          <div className="relative overflow-hidden rounded-[20px] border border-border bg-background p-3 flex flex-col h-[110px] shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/50 text-foreground mb-auto">
              <Shield size={14} strokeWidth={2.5} />
            </div>
            <div className="z-10 pb-3">
              <p className="text-[18px] font-black text-foreground">{account.credibility ?? 80}%</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Credibility</p>
            </div>
            <div className="absolute bottom-3 left-3 right-3 h-[3px] bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-foreground rounded-full" style={{ width: `${account.credibility ?? 80}%` }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex justify-between gap-2 overflow-x-auto whitespace-nowrap border-b border-border text-[13px] font-semibold text-muted-foreground scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', Icon: PieChart },
            { id: 'activity', label: 'Activity', Icon: Activity },
            { id: 'impact', label: 'Impact', Icon: Target },
            { id: 'about', label: 'About', Icon: User },
          ].map(({ id, label, Icon }) => (
            <Link
              key={id}
              href={`?tab=${id}`}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-3 border-b-2 transition-colors',
                activeTab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent hover:text-foreground'
              )}
            >
              <Icon size={18} strokeWidth={activeTab === id ? 2.5 : 2} />
              {label}
            </Link>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="mt-6 mb-12">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Activity Mini-Feed */}
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-bold text-foreground">Recent Activity</h3>
                  <Link href={`?tab=activity`} className="text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
                    View all <ArrowRight size={14} />
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {filings.slice(0, 3).map((filing: any, i) => {
                    // Create mock impacts if filing doesn't have one to match UI
                    const fakeImpact = Math.floor(Math.random() * 800) + 100;
                    return (
                      <div key={filing._id || i} className="flex items-center gap-3">
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted border border-border relative">
                          {filing.evidence?.[0]?.url ? (
                            <img src={filing.evidence[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Target size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                          <Plus size={12} strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-bold text-foreground leading-snug line-clamp-2">
                            {filing.title || filing.description || 'Activity filed'}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {filing.timestamp ? new Date(filing.timestamp).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span className="inline-flex rounded-full bg-green-50 px-2 py-1 text-[12px] font-bold text-green-600">
                            +{filing.impact ?? fakeImpact}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filings.length === 0 && (
                    <div className="py-6 text-center text-[13px] text-muted-foreground">
                      No recent activity recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[16px] font-bold text-foreground">Captured Posts</h3>
                <PostsFeed posts={account.posts ?? []} />
              </div>
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[16px] font-bold text-foreground">Filings on Record</h3>
                <FilingsList filings={filings as any} />
              </div>
            </div>
          )}

          {/* IMPACT TAB */}
          {activeTab === 'impact' && (
            <div className="space-y-6">
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <ScoreHistory />
              </div>
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="text-[16px] font-bold text-foreground">Score Breakdown</h3>
                <p className="mt-1 text-[13px] text-muted-foreground mb-6">Dimensions calculated from profile metrics.</p>
                <div className="py-2 flex justify-center">
                  <ScoreRadar breakdown={account.breakdown} />
                </div>
              </div>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="rounded-[24px] bg-background p-5 shadow-sm border border-border">
                <h3 className="mb-4 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">Profile Overview</h3>
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
                  {socialLinks.length > 0 && (
                    <div className="flex items-start justify-between pb-3">
                      <span className="text-muted-foreground">Linked Accounts</span>
                      <div className="flex flex-col items-end gap-1.5 font-semibold">
                        {socialLinks.map(([platform, link]) => (
                          <a key={platform} href={link!.url} className="hover:text-primary transition-colors flex items-center gap-1" target="_blank" rel="noreferrer">
                            {formatPlatform(platform)}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
