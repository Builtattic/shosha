'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, UserCircle, Target, Shield, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FeedItem } from '@/components/feed/FeedItem';

export default function ProfilePage() {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<{ user: any, claimedAccounts: any[], recentEvents: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.ok ? res.json() : null)
      .then(payload => {
        if (payload?.ok) {
          setData(payload.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (authLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasActivity = data && (data.claimedAccounts.length > 0 || data.recentEvents.length > 0);

  if (!hasActivity && data) {
    return (
      <main className="min-h-screen bg-background pb-24 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {onboardingStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md w-full text-center space-y-6"
            >
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
                <Target size={40} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome to Shoशा</h1>
              <p className="text-muted-foreground text-lg">
                The continuous reputation ledger. Let&apos;s get your profile set up. How do you plan to use the platform?
              </p>
              
              <div className="grid gap-4 pt-6">
                <button 
                  onClick={() => setOnboardingStep(1)}
                  className="flex items-center p-4 border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mr-4">
                    <UserCircle size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">I am a Public Figure</h3>
                    <p className="text-sm text-muted-foreground">Claim your account and manage your reputation.</p>
                  </div>
                  <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                
                <button 
                  onClick={() => setOnboardingStep(2)}
                  className="flex items-center p-4 border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mr-4">
                    <Shield size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">I am a Citizen Journalist</h3>
                    <p className="text-sm text-muted-foreground">File reports, verify events, and build credibility.</p>
                  </div>
                  <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            </motion.div>
          )}

          {onboardingStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md w-full space-y-6"
            >
              <button onClick={() => setOnboardingStep(0)} className="text-sm text-muted-foreground hover:text-foreground mb-4">
                ← Back
              </button>
              <h2 className="text-2xl font-bold">Claim Your Account</h2>
              <p className="text-muted-foreground">Search for your public profile to verify ownership and gain control over your reputation ledger.</p>
              
              <Link href="/dashboard" className="block w-full text-center py-3 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity">
                Go to Search
              </Link>
            </motion.div>
          )}

          {onboardingStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md w-full space-y-6"
            >
              <button onClick={() => setOnboardingStep(0)} className="text-sm text-muted-foreground hover:text-foreground mb-4">
                ← Back
              </button>
              <h2 className="text-2xl font-bold">Start Filing Events</h2>
              <p className="text-muted-foreground">Browse the feed for events to verify, or search for a public figure to file a new event on their ledger.</p>
              
              <Link href="/feed" className="block w-full text-center py-3 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity">
                View Live Feed
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Profile Header */}
      <div className="bg-card border-b border-border pt-12 pb-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <img 
              src={firebaseUser?.photoURL ?? `https://api.dicebear.com/9.x/initials/svg?seed=${firebaseUser?.displayName ?? 'User'}`}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-background shadow-lg"
            />
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full border-2 border-background">
              PRO
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">{firebaseUser?.displayName ?? firebaseUser?.email?.split('@')[0] ?? 'Anonymous Reporter'}</h1>
            <p className="text-muted-foreground">@{data?.user?.username ?? 'user'}</p>
          </div>

          <div className="flex gap-6 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{data?.user?.reporterScore ?? 50}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Credibility</div>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{data?.recentEvents.length ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Events Filed</div>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{data?.claimedAccounts.length ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Accounts</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {/* Claimed Accounts Section */}
        {data?.claimedAccounts && data.claimedAccounts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="text-primary" size={20} />
                Managed Profiles
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.claimedAccounts.map((acc: any) => (
                <Link key={acc._id} href={`/account/${acc._id}`}>
                  <div className="p-4 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow flex items-center gap-4 group">
                    <img src={acc.avatarUrl} alt={acc.displayName} className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1">
                      <h3 className="font-bold flex items-center gap-1">
                        {acc.displayName}
                        {acc.verified && <CheckCircle2 size={14} className="text-blue-500" />}
                      </h3>
                      <p className="text-sm text-muted-foreground">@{acc.username}</p>
                    </div>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent Events Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="text-primary" size={20} />
              Recent Filings
            </h2>
            <Link href="/dashboard" className="text-sm text-primary hover:underline font-medium">
              File New Event
            </Link>
          </div>
          
          {data?.recentEvents && data.recentEvents.length > 0 ? (
            <div className="space-y-4">
              {data.recentEvents.map((event: any) => (
                <div key={event._id} className="p-4 rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold uppercase",
                      event.eventType === 'positive' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                    )}>
                      {event.eventType}
                    </div>
                    <span className="text-sm text-muted-foreground">Target: {event.subjectId}</span>
                  </div>
                  <p className="text-sm font-medium">{event.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                    <span className="capitalize px-2 py-1 bg-muted rounded-full">Status: {event.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-3xl border border-dashed border-border">
              <div className="mx-auto w-12 h-12 bg-background rounded-full flex items-center justify-center text-muted-foreground mb-3">
                <Search size={20} />
              </div>
              <p className="text-muted-foreground">No events filed yet.</p>
              <Link href="/dashboard" className="text-primary font-medium hover:underline mt-2 inline-block">
                Start investigating
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
