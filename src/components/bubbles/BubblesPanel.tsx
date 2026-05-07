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
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:px-12">
        <header className="mb-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-[32px] md:text-[40px] font-black leading-tight tracking-tight text-foreground uppercase">SHOSHA</h1>
              <p className="text-[14px] md:text-[16px] font-bold text-muted-foreground uppercase tracking-widest">Community Bubbles</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/bubbles/create')}
                className="flex h-12 px-6 items-center justify-center gap-2 rounded-full bg-primary text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
              >
                <Plus size={20} strokeWidth={3} />
                <span className="font-black text-sm uppercase tracking-wider">Create Bubble</span>
              </button>
              <button className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-foreground transition-all hover:bg-muted active:scale-90">
                <Bell size={22} />
                <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white ring-2 ring-background">3</span>
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-foreground transition-all hover:bg-muted active:scale-90">
                <Menu size={22} />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input 
                placeholder="Search communities, topics, or members..." 
                className="h-14 w-full rounded-[24px] border border-border bg-card/50 pl-12 pr-4 text-sm md:text-base outline-none transition-all focus:bg-card focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {BUBBLE_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "shrink-0 rounded-full border px-5 py-2 text-[13px] md:text-[14px] font-bold transition-all",
                      filter === f 
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10" 
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[24px] border border-border bg-card text-foreground transition-all hover:border-primary/50">
                <SlidersHorizontal size={20} />
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bubbles.map((bubble) => (
            <article 
              key={bubble._id} 
              onClick={() => router.push(`/bubbles/${bubble._id}`)}
              className="group cursor-pointer relative overflow-hidden rounded-[32px] border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 active:scale-[0.98]"
            >
              <div className="relative h-48 w-full overflow-hidden">
                {bubble.coverImageUrl ? (
                  <img src={bubble.coverImageUrl} alt={`${bubble.name} cover`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/50">
                    <Building2 size={48} className="text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
                
                <div className="absolute bottom-5 left-5 flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-[20px] border-2 border-white/20 shadow-2xl backdrop-blur-md">
                    {bubble.imageUrl ? (
                      <img src={bubble.imageUrl} alt={bubble.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-background/80 text-primary">
                        <Users size={28} />
                      </div>
                    )}
                  </div>
                  <div className="text-white">
                    <h2 className="text-[20px] font-black leading-tight drop-shadow-lg">{bubble.name}</h2>
                    <p className="text-[12px] font-bold text-white/80 uppercase tracking-wider">{bubble.tagline || bubble.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="absolute right-5 top-5 rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/10">
                  {bubble.type.replace('_', ' ')}
                </div>
              </div>

              <div className="flex flex-col p-6 h-[200px]">
                <p className="line-clamp-3 text-[14px] leading-relaxed text-muted-foreground flex-1">
                  {bubble.description}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1">
                      <Users size={14} className="text-muted-foreground" />
                      <span className="text-[13px] font-black">{bubble.memberCount ?? 1}</span>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-7 w-7 rounded-full border-2 border-card bg-muted shadow-sm" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] font-black text-primary group-hover:translate-x-1 transition-transform">
                    View <ArrowRight size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
