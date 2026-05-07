'use client';

import { useState } from 'react';
import { Building2, CalendarDays, Camera, ChevronUp, Users } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type BubbleCard = {
  _id: string;
  name: string;
  tagline?: string;
  description: string;
  type: string;
  category?: string;
  coverImageUrl?: string;
  imageUrl?: string;
  createdAt: string;
  memberCount?: number;
  topMembers?: Array<{ userId: string; score: number; previousRank?: number }>;
};

const types = [
  { value: 'family', label: 'Family' },
  { value: 'friend_group', label: 'Friend Group' },
  { value: 'college_group', label: 'College Group' },
  { value: 'work_group', label: 'Work Group' },
  { value: 'company', label: 'Company' },
  { value: 'sports_group', label: 'Sports Group' },
  { value: 'other', label: 'Other' },
];

function label(value: string) {
  return types.find((type) => type.value === value)?.label ?? value.replace(/_/g, ' ');
}

export function BubblesPanel({ initialBubbles }: { initialBubbles: BubbleCard[] }) {
  const toast = useToast();
  const [bubbles, setBubbles] = useState(initialBubbles);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    tagline: '',
    description: '',
    type: 'friend_group',
    category: '',
    coverImageUrl: '',
    imageUrl: '',
  });

  async function createBubble() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/bubbles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          coverImageUrl: form.coverImageUrl || undefined,
          imageUrl: form.imageUrl || undefined,
          category: form.category || undefined,
          tagline: form.tagline || undefined,
        }),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Could not create bubble.');
      setBubbles((current) => [payload.data, ...current]);
      setForm({ name: '', tagline: '', description: '', type: 'friend_group', category: '', coverImageUrl: '', imageUrl: '' });
      toast.push('Bubble created.');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not create bubble.');
    } finally {
      setCreating(false);
    }
  }

  async function requestJoin(id: string) {
    try {
      const res = await fetch(`/api/bubbles/${id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Could not request to join.');
      toast.push(payload.data?.alreadyMember ? 'Already a member.' : 'Join request sent for member approval.');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not request to join.');
    }
  }

  return (
    <main className="min-h-screen bg-background safe-bottom px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-2">
          <p className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">Bubbles</p>
          <h1 className="text-[30px] font-black text-foreground">Groups with shared impact.</h1>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-black text-foreground">Create Bubble</h2>
              <p className="text-[12px] text-muted-foreground">College bubbles require an admin profile.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bubble name" className="rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20" />
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline" className="rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20">
              {types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20" />
            <input value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} placeholder="Cover image URL" className="rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20" />
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Bubble image URL" className="rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Purpose, members, and what this bubble tracks" className="min-h-24 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 md:col-span-2" />
          </div>

          <button
            type="button"
            onClick={createBubble}
            disabled={creating || form.name.length < 2 || form.description.length < 10}
            className="mt-4 w-full rounded-full bg-foreground px-5 py-3 text-[13px] font-black text-background transition-opacity disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Bubble'}
          </button>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {bubbles.map((bubble) => (
            <article key={bubble._id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="relative h-36 bg-muted">
                {bubble.coverImageUrl ? (
                  <img src={bubble.coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Camera size={28} />
                  </div>
                )}
                <div className="absolute -bottom-8 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-background">
                  {bubble.imageUrl ? <img src={bubble.imageUrl} alt={bubble.name} className="h-full w-full object-cover" /> : <Users size={24} className="text-muted-foreground" />}
                </div>
              </div>
              <div className="p-4 pt-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[18px] font-black text-foreground">{bubble.name}</h2>
                    <p className="text-[12px] font-semibold text-muted-foreground">{bubble.tagline || label(bubble.type)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {label(bubble.type)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{bubble.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="font-black text-foreground">{bubble.memberCount ?? 1}</p>
                    <p className="text-muted-foreground">Members</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="font-black text-foreground">{bubble.topMembers?.length ?? 0}</p>
                    <p className="text-muted-foreground">Ranked</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {(bubble.topMembers ?? []).slice(0, 3).map((member, i) => {
                    const movement = typeof member.previousRank === 'number' ? member.previousRank - (i + 1) : 0;
                    return (
                      <div key={member.userId} className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-[12px]">
                        <span className="font-bold text-foreground">#{i + 1} Member</span>
                        <span className={cn('flex items-center gap-1 font-black', movement >= 0 ? 'text-primary' : 'text-destructive')}>
                          <ChevronUp size={13} className={movement < 0 ? 'rotate-180' : ''} />
                          {member.score}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button type="button" onClick={() => requestJoin(bubble._id)} className="mt-4 w-full rounded-full border border-border bg-background px-4 py-2.5 text-[12px] font-black text-foreground hover:bg-muted">
                  Request to Join
                </button>
                <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <CalendarDays size={11} /> More than 50% of members must approve.
                </p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
