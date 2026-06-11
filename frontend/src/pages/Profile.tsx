import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Pencil } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getMyFilings, replayMyScore, type MeFiling, type ScoreReplayResult } from '@/api/me';
import FilingsList from '@/components/profile/FilingsList';
import SwipeScoreBreakdownCard from '@/components/profile/SwipeScoreBreakdownCard';
import ProfileImpactAnalytics from '@/components/profile/ProfileImpactAnalytics';
import ShareCardModal from '@/components/profile/ShareCardModal';
import {
  ConnectionListModal,
  type ConnectionListModalRef,
} from '@/components/profile/ConnectionListModal';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'filings' | 'activity';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, firebaseUser, isLoading } = useAuth();
  const connectionListModalRef = useRef<ConnectionListModalRef>(null);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filings, setFilings] = useState<MeFiling[]>([]);
  const [score, setScore] = useState(1000);
  const [replayResults, setReplayResults] = useState<ScoreReplayResult['account_results']>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;

    async function load() {
      setLoadingExtras(true);
      try {
        void replayMyScore()
          .then((result) => {
            if (!mounted) return;
            setReplayResults(result.account_results ?? []);
            const first = result.account_results?.[0]?.final_score;
            if (typeof first === 'number') setScore(first);
          })
          .catch(() => null);

        const filingsRes = await getMyFilings();
        if (mounted) setFilings(filingsRes.filings ?? []);
      } finally {
        if (mounted) setLoadingExtras(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  const displayName =
    profile.display_name ??
    firebaseUser?.displayName ??
    profile.username ??
    'User';
  const username = profile.username ?? 'user';
  const avatarSeed = displayName.replace(/^@/, '');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'filings', label: 'Filings' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary uppercase">
              {avatarSeed.charAt(0)}
            </div>
            <div>
              <h1 className="text-[22px] font-bold">{displayName}</h1>
              <p className="text-[13px] text-muted-foreground">@{username}</p>
              {profile.headline ? (
                <p className="mt-1 text-[13px] text-muted-foreground">{profile.headline}</p>
              ) : null}
              {profile.city ? (
                <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
                  <MapPin size={12} /> {profile.city}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold hover:bg-muted"
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold hover:bg-muted"
            >
              <Pencil size={12} />
              Edit
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Shosha Score
          </p>
          <p className="mt-1 text-[44px] font-black tabular-nums">{score.toLocaleString()}</p>
        </div>

        {profile.id ? (
          <ConnectionListModal
            ref={connectionListModalRef}
            targetUserId={profile.id}
            followersCount={0}
            followingCount={0}
            showInlineTriggers={false}
          />
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!profile.id}
            onClick={() => connectionListModalRef.current?.open('followers')}
            className="rounded-2xl border border-border py-3 text-center text-[12px] font-bold disabled:opacity-50"
          >
            0 Followers
            {/* TODO: wire follower counts when available */}
          </button>
          <button
            type="button"
            disabled={!profile.id}
            onClick={() => connectionListModalRef.current?.open('following')}
            className="rounded-2xl border border-border py-3 text-center text-[12px] font-bold disabled:opacity-50"
          >
            0 Following
          </button>
        </div>

        <div className="mt-8 flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 border-b-2 py-3 text-[13px] font-semibold',
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-4"
              >
                {profile.bio ? (
                  <div className="rounded-2xl border border-border p-4">
                    <h3 className="mb-2 text-[13px] font-bold uppercase text-muted-foreground">Bio</h3>
                    <p className="text-[14px] leading-relaxed">{profile.bio}</p>
                  </div>
                ) : null}
                <SwipeScoreBreakdownCard swipeAggregate={null} totalScore={score} />
              </motion.div>
            )}

            {activeTab === 'filings' && (
              <motion.div
                key="filings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-2xl border border-border p-4"
              >
                {loadingExtras ? (
                  <p className="py-8 text-center text-muted-foreground">Loading filings…</p>
                ) : (
                  <FilingsList filings={filings} />
                )}
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-4"
              >
                <ProfileImpactAnalytics
                  history={[]}
                  filings={filings.map((f) => ({
                    id: f.id,
                    title: f.title ?? '',
                    category: f.category ?? 'General',
                    delta: f.delta,
                    type: (f.type === 'positive' ? 'positive' : 'negative') as 'positive' | 'negative',
                    status: f.status,
                    created_at: f.created_at,
                  }))}
                  showGraph
                  showImpactDetails
                  swipeAggregate={null}
                  totalScore={score}
                />
                {replayResults.length > 0 && (
                  <div className="space-y-2">
                    {replayResults.map((row) => (
                      <div
                        key={row.account_id}
                        className="flex items-center justify-between rounded-xl border border-border p-4"
                      >
                        <div>
                          <p className="text-[14px] font-bold">
                            {row.platform} · @{row.handle}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Score replay</p>
                        </div>
                        <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-bold tabular-nums">
                          {row.final_score.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      <ShareCardModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        displayName={profile.display_name}
        username={username}
        score={score}
        totalFilings={filings.length}
      />
    </div>
  );
}
