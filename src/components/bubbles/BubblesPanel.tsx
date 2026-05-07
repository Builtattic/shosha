'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  CalendarDays, 
  Camera, 
  ChevronUp, 
  Users, 
  Plus,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Bell,
  Menu
} from 'lucide-react';
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
  topMembers?: Array<{ userId: string; name?: string; avatar?: string; score: number; previousRank?: number }>;
};

const BUBBLE_FILTERS = ['Global', 'My Bubbles', 'Trending', 'Newest'];

export function BubblesPanel({ initialBubbles }: { initialBubbles: BubbleCard[] }) {
  const router = useRouter();
  const [bubbles] = useState(initialBubbles);
  const [filter, setFilter] = useState('Global');

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[32px] font-black leading-tight tracking-tight text-foreground uppercase">SHOSHA</h1>
              <p className="text-[14px] font-bold text-muted-foreground uppercase tracking-widest">Bubbles</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/bubbles/create')}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all active:scale-90"
              >
                <Plus size={24} />
              </button>
              <button className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-foreground transition-all active:scale-90">
                <Bell size={24} />
                <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white ring-2 ring-background">3</span>
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-foreground transition-all active:scale-90">
                <Menu size={24} />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                placeholder="Search bubbles..." 
                className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-foreground">
              <SlidersHorizontal size={20} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {BUBBLE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-bold transition-all",
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        <section className="space-y-6">
          {bubbles.map((bubble) => (
            <article 
              key={bubble._id} 
              onClick={() => router.push(`/bubbles/${bubble._id}`)}
              className="group relative overflow-hidden rounded-[32px] border border-border bg-card shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="relative h-40 w-full overflow-hidden">
                {bubble.coverImageUrl ? (
                  <img src={bubble.coverImageUrl} alt={`${bubble.name} cover`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/50">
                    <Building2 size={40} className="text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                <div className="absolute bottom-4 left-4 flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border-2 border-white/20 shadow-lg backdrop-blur-md">
                    {bubble.imageUrl ? (
                      <img src={bubble.imageUrl} alt={bubble.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-background/80 text-primary">
                        <Users size={24} />
                      </div>
                    )}
                  </div>
                  <div className="text-white">
                    <h2 className="text-[18px] font-black leading-tight drop-shadow-md">{bubble.name}</h2>
                    <p className="text-[12px] font-bold opacity-80">{bubble.tagline || bubble.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="absolute right-4 top-4 rounded-full bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                  {bubble.type.replace('_', ' ')}
                </div>
              </div>

              <div className="p-5">
                <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                  {bubble.description}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-muted-foreground" />
                      <span className="text-[13px] font-black">{bubble.memberCount ?? 1}</span>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-card bg-muted" />
                      ))}
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-[13px] font-black text-primary">
                    Enter Bubble <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
