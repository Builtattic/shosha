'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BadgeCheck, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { ClaimProfileModal } from '@/components/profile/ClaimProfileModal';
import { cn } from '@/lib/utils';

type SearchAccount = {
  _id: string;
  platform?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followers?: string;
  verified?: boolean;
  claimed?: boolean;
  claimable?: boolean;
};

export function ClaimProfileSearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<SearchAccount | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setPicked(null);
    setError('');
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/accounts/search?q=${encodeURIComponent(q)}&discover=0`);
        const payload = await res.json();
        if (cancelled) return;
        if (!payload.ok) {
          setError(payload.error?.message ?? 'Search failed');
          setResults([]);
        } else {
          const accs: SearchAccount[] = (payload.data?.accounts ?? []) as SearchAccount[];
          setResults(accs);
          setError('');
        }
      } catch {
        if (!cancelled) setError('Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open]);

  const claimable = useMemo(
    () => results.filter((r) => r.claimable !== false && !r.claimed),
    [results]
  );
  const locked = useMemo(
    () => results.filter((r) => r.claimable === false || r.claimed),
    [results]
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {!picked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[180] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-background border border-border p-5 sm:p-6 max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold">Claim an Existing Profile</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-[12px] text-muted-foreground">
              Search for a profile someone else made of you. We&apos;ll verify your identity before transferring ownership.
            </p>

            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or @username"
                className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="flex-1 -mx-1 overflow-y-auto px-1 pb-1">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12px] font-medium text-red-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading && (
                <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-[12px]">
                  <Loader2 size={14} className="animate-spin" />
                  Searching…
                </div>
              )}

              {!loading && query.trim().length < 2 && (
                <div className="py-12 text-center text-muted-foreground text-[12px]">
                  Type a name or username to find a claimable profile.
                </div>
              )}

              {!loading && query.trim().length >= 2 && claimable.length === 0 && locked.length === 0 && !error && (
                <div className="py-10 text-center">
                  <p className="text-[13px] font-bold mb-1">No matches</p>
                  <p className="text-[11px] text-muted-foreground">
                    No existing profile matches “{query}”. The person can be added via the Add Profile flow.
                  </p>
                </div>
              )}

              {claimable.length > 0 && (
                <ul className="space-y-2 mt-1">
                  <li className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Claimable
                  </li>
                  {claimable.map((acc) => (
                    <li key={acc._id}>
                      <button
                        type="button"
                        onClick={() => setPicked(acc)}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                      >
                        <img
                          src={acc.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(acc.displayName)}`}
                          alt={acc.displayName}
                          className="h-10 w-10 rounded-full object-cover bg-muted"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-bold truncate">{acc.displayName}</p>
                            {acc.verified && <BadgeCheck size={13} className="text-primary shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            @{acc.username}
                            {acc.platform && acc.platform !== 'website' ? ` · ${acc.platform}` : ''}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {locked.length > 0 && (
                <ul className="space-y-2 mt-4">
                  <li className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Already claimed / locked
                  </li>
                  {locked.map((acc) => (
                    <li key={acc._id}>
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-3 py-2.5 opacity-70">
                        <img
                          src={acc.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(acc.displayName)}`}
                          alt={acc.displayName}
                          className="h-10 w-10 rounded-full object-cover bg-muted"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-bold truncate">{acc.displayName}</p>
                            {acc.verified && <BadgeCheck size={13} className="text-primary shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">@{acc.username}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {acc.claimed ? 'Claimed' : 'Locked'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {picked && (
        <ClaimProfileModal
          open={Boolean(picked)}
          onClose={() => { setPicked(null); onClose(); }}
          accountId={picked._id}
          targetUser={{
            name: picked.displayName,
            handle: picked.username,
            avatar: picked.avatarUrl
              || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(picked.displayName)}`,
          }}
        />
      )}
    </AnimatePresence>
  );
}
