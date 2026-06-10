import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, Users, Plus, Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bubble, BubbleType } from '@/types/bubble';

const BUBBLE_FILTERS = ['Global', 'Trending', 'Newest'];

function bubbleTypeLabel(type: BubbleType): string {
  const labels: Record<BubbleType, string> = {
    FAMILY: 'Family',
    FRIEND_GROUP: 'Friend Group',
    COLLEGE_GROUP: 'College Group',
    WORK_GROUP: 'Work Group',
    COMPANY: 'Company',
    SPORTS_GROUP: 'Sports Group',
    OTHER: 'Other',
  };
  return labels[type] ?? type.replace(/_/g, ' ');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BubblesPanel({ initialBubbles }: { initialBubbles: Bubble[] }) {
  const navigate = useNavigate();
  const [bubbles] = useState(initialBubbles);
  const [filter, setFilter] = useState('Global');
  const [query, setQuery] = useState('');

  const filteredBubbles = useMemo(() => {
    const cleaned = query.trim().toLowerCase();
    const matches = bubbles.filter((bubble) => {
      const haystack =
        `${bubble.name} ${bubble.tagline ?? ''} ${bubble.description} ${bubble.bubble_type} ${bubble.category ?? ''}`.toLowerCase();
      return !cleaned || haystack.includes(cleaned);
    });
    if (filter === 'Newest') {
      return [...matches].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    if (filter === 'Trending') {
      return [...matches].sort((a, b) => b.member_count - a.member_count);
    }
    return matches;
  }, [bubbles, filter, query]);

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:px-12">
        <div className="mb-6 flex">
          <button
            type="button"
            onClick={() => navigate('/bubbles/new')}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="text-sm font-black uppercase tracking-wider">Create Bubble</span>
          </button>
        </div>

        <div className="mb-10 flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={20}
              />
              <input
                placeholder="Search communities, topics, or members..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 w-full rounded-[24px] border border-border bg-card/50 pl-12 pr-4 text-sm outline-none transition-all focus:bg-card focus:ring-4 focus:ring-primary/10 md:text-base"
              />
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
              {BUBBLE_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'shrink-0 rounded-full border px-5 py-2 text-[13px] font-bold transition-all md:text-[14px]',
                    filter === f
                      ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBubbles.map((bubble) => (
            <article
              key={bubble.id}
              onClick={() => navigate(`/bubbles/${bubble.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/bubbles/${bubble.id}`);
              }}
              role="button"
              tabIndex={0}
              className="group relative cursor-pointer overflow-hidden rounded-[26px] border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-black/5 active:scale-[0.98]"
            >
              <div className="relative h-48 w-full overflow-hidden">
                {bubble.cover_image_url ? (
                  <img
                    src={bubble.cover_image_url}
                    alt={`${bubble.name} cover`}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(135deg,var(--muted),var(--card))]">
                    <Building2 size={48} className="text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

                <div className="absolute bottom-5 left-5 flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border-2 border-white/40 bg-white/15 shadow-2xl backdrop-blur-md">
                    {bubble.image_url ? (
                      <img
                        src={bubble.image_url}
                        alt={bubble.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-background/80 text-primary">
                        <Users size={28} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 text-white">
                    <h2 className="truncate text-[20px] font-black leading-tight drop-shadow-lg">
                      {bubble.name}
                    </h2>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-white/80">
                      {bubble.tagline || bubbleTypeLabel(bubble.bubble_type)}
                    </p>
                  </div>
                </div>

                <div className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                  {bubbleTypeLabel(bubble.bubble_type)}
                </div>
              </div>

              <div className="flex h-[210px] flex-col p-6">
                <p className="line-clamp-3 flex-1 text-[14px] leading-relaxed text-muted-foreground">
                  {bubble.description}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1">
                      <Users size={14} className="text-muted-foreground" />
                      <span className="text-[13px] font-black">{bubble.member_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1 text-[12px] font-bold text-muted-foreground">
                      <CalendarDays size={13} />
                      {formatDate(bubble.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] font-black text-primary transition-transform group-hover:translate-x-1">
                    View <ArrowRight size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        {filteredBubbles.length === 0 && (
          <div className="mt-12 rounded-[26px] border border-dashed border-border bg-card/60 px-6 py-14 text-center">
            <Users size={34} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-black">No bubbles found</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Try a different search or create the first one for this topic.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
