import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Shield } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  getAccount,
  getAccountScoreHistory,
  getAccountScoreWindows,
  listAccountReports,
  listAccounts,
} from '@/api/accounts';
import type { ScoreHistoryEntry, WindowScoresRaw } from '@/api/accounts';
import type { Account } from '@/types/account';
import ScoreLedgerPanel from '@/components/profile/ScoreLedgerPanel';
import type { WindowScores } from '@/components/profile/ScoreLedgerPanel';
import ProfileImpactAnalytics from '@/components/profile/ProfileImpactAnalytics';
import type { HistoryPoint } from '@/components/profile/ProfileImpactAnalytics';
import { applySheetScore, BASE_SCORE } from '@/lib/scoring';
import SimilarProfiles from '@/components/profile/SimilarProfiles';
import AccountShareButton from '@/components/profile/AccountShareButton';
import { isAdminRole } from '@/lib/roles';
import type { MeFiling } from '@/api/me';
import { reportToMeFiling } from '@/lib/reportToMeFiling';
import LiveAccountScorePanel from '@/components/profile/LiveAccountScorePanel';
import DossierActions from '@/components/profile/DossierActions';
import FilingsList from '@/components/profile/FilingsList';
import { FollowButton } from '@/components/profile/FollowButton';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'activity' | 'about' | 'impact';

// Backend returns per-entry deltas (s = delta). Rebuild the cumulative score
// timeline with the same sheet-score decay the ledger uses for V1 parity.
function ledgerToHistory(entries: ScoreHistoryEntry[]): HistoryPoint[] {
  let score = BASE_SCORE;
  return entries.map((entry) => {
    score = applySheetScore(score, entry.s).score;
    return { t: entry.t, s: score, delta: entry.s };
  });
}

function toWindowScores(raw: WindowScoresRaw | null): WindowScores | null {
  if (!raw) return null;
  return {
    w1Delta: raw.w1_delta,
    w1Decay: raw.w1_decay,
    w1Score: raw.w1_score,
    w2Delta: raw.w2_delta,
    w2Decay: raw.w2_decay,
    w2Score: raw.w2_score,
    w3Delta: raw.w3_delta,
    w3Decay: raw.w3_decay,
    w3Score: raw.w3_score,
  };
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [account, setAccount] = useState<Account | null>(null);
  const [filings, setFilings] = useState<MeFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [similarAccounts, setSimilarAccounts] = useState<Account[]>([]);
  const [scoreHistory, setScoreHistory] = useState<HistoryPoint[]>([]);
  const [windowScores, setWindowScores] = useState<WindowScores | null>(null);

  useEffect(() => {
    const accountId = id;
    if (!accountId) return;
    let mounted = true;

    async function load(resolvedId: string) {
      setLoading(true);
      setError(null);
      try {
        const [accRes, repRes, allRes, histRes, winRes] = await Promise.all([
          getAccount(resolvedId),
          listAccountReports(resolvedId),
          listAccounts(6),
          getAccountScoreHistory(resolvedId),
          getAccountScoreWindows(resolvedId),
        ]);
        if (!mounted) return;
        if (!accRes.ok || !accRes.data?.account) {
          throw new Error(accRes.error || 'Account not found');
        }
        const loadedAccount = accRes.data.account;
        setAccount(loadedAccount);
        const items = repRes.ok && repRes.data ? repRes.data.items : [];
        setFilings(items.map(reportToMeFiling));
        setScoreHistory(
          histRes.ok && histRes.data ? ledgerToHistory(histRes.data.history) : [],
        );
        setWindowScores(
          winRes.ok && winRes.data ? toWindowScores(winRes.data.window_scores) : null,
        );
        const allItems = allRes.items ?? [];
        const similar = allItems
          .filter((a) => a.id !== loadedAccount.id)
          .filter((a) => !loadedAccount.platform || a.platform === loadedAccount.platform)
          .slice(0, 5);
        setSimilarAccounts(similar.length > 0 ? similar : allItems.filter((a) => a.id !== loadedAccount.id).slice(0, 5));
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load account');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load(accountId);
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 animate-pulse">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="h-24 w-24 rounded-full bg-muted mx-auto" />
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 mx-auto text-destructive opacity-50" />
          <h2 className="text-xl font-bold">Account Not Found</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full bg-secondary px-6 py-2 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'impact', label: 'Impact' },
    { id: 'about', label: 'About' },
  ];

  const impactFilings = filings.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    category: r.category ?? 'General',
    delta: r.delta,
    type: r.type as 'positive' | 'negative',
    status: r.status,
    created_at: r.created_at,
  }));

  const socialLinks =
    account.social_links?.length > 0 ? account.social_links : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[14px] font-bold">
              {account.display_name ?? account.handle}
            </p>
            <p className="text-[11px] text-muted-foreground">@{account.handle}</p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary uppercase">
              {(account.display_name ?? account.handle).charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold">{account.display_name ?? account.handle}</h1>
              <p className="text-[12px] text-muted-foreground">@{account.handle}</p>
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                {account.platform}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <AccountShareButton
                displayName={account.display_name}
                username={account.handle}
                score={account.score}
                platform={account.platform}
                bio={account.bio}
              />
              {account.owner_user_id ? (
                <FollowButton
                  targetUserId={account.owner_user_id}
                  initialFollowing={false}
                />
              ) : null}
            </div>
            <DossierActions
              accountId={account.id}
              ownerId={account.owner_user_id}
              currentUserId={profile?.id ?? null}
              targetName={account.display_name ?? account.handle}
              targetHandle={account.handle}
            />
          </div>
        </div>

        <LiveAccountScorePanel
          accountId={account.id}
          initialScore={account.score}
          linkedUserId={account.owner_user_id}
        />

        <ScoreLedgerPanel
          windowScores={windowScores}
          globalScore={account.score}
          viewerIsAdmin={isAdminRole(profile?.role)}
        />

        <div className="mt-8 flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 border-b-2 py-3 text-[13px] font-semibold transition-colors',
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 mb-12">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-border p-4">
                  <h3 className="mb-3 text-[15px] font-bold">Recent Filings</h3>
                  <FilingsList filings={filings.slice(0, 3)} />
                </div>
                <SimilarProfiles accounts={similarAccounts} />
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-2xl border border-border p-4"
              >
                <h3 className="mb-4 text-[15px] font-bold">Filings on Record</h3>
                <FilingsList filings={filings} />
              </motion.div>
            )}

            {activeTab === 'impact' && (
              <motion.div
                key="impact"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <ProfileImpactAnalytics
                  history={scoreHistory}
                  filings={impactFilings}
                  showGraph={scoreHistory.length >= 2}
                  showImpactDetails
                  totalScore={account.score}
                />
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-border p-4">
                  <h3 className="mb-3 text-[14px] font-bold uppercase tracking-wider text-muted-foreground">
                    Profile Overview
                  </h3>
                  {account.bio ? (
                    <p className="text-[14px] leading-relaxed">{account.bio}</p>
                  ) : (
                    <p className="text-[14px] italic text-muted-foreground">No bio provided.</p>
                  )}
                  <dl className="mt-4 space-y-2 text-[13px]">
                    <div className="flex justify-between border-b border-border pb-2">
                      <dt className="text-muted-foreground">Platform</dt>
                      <dd className="font-semibold">{account.platform}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <dt className="text-muted-foreground">Handle</dt>
                      <dd className="font-semibold">@{account.handle}</dd>
                    </div>
                    <div className="flex justify-between pb-2">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="font-semibold">{account.status}</dd>
                    </div>
                  </dl>
                  {socialLinks.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">
                        Official Links
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {socialLinks.map((link) => (
                          <a
                            key={`${link.platform}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[12px] font-medium hover:bg-muted"
                          >
                            <MapPin size={12} className="opacity-50" />
                            {link.platform}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
