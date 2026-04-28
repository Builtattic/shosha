import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type LeaderRow = {
  _id: string;
  displayName: string;
  username?: string;
  platform?: 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin' | 'website';
  score: number;
  followers?: string;
  bio?: string;
  delta?: number;
  historical?: boolean;
};

const bestFallback: LeaderRow[] = [
  { _id: 'mandela', displayName: 'Nelson Mandela', bio: 'STATESMAN · SOUTH AFRICA', score: 248900, delta: 0, historical: true },
  { _id: 'malala', displayName: 'Malala Yousafzai', bio: 'ACTIVIST · PAKISTAN', score: 84210, delta: 2140 },
  { _id: 'keanu', displayName: 'Keanu Reeves', bio: 'ACTOR · CANADA', score: 62400, delta: 840 },
  { _id: 'jacinda', displayName: 'Jacinda Ardern', bio: 'FORMER PM · NEW ZEALAND', score: 58100, delta: 420 },
  { _id: 'greta', displayName: 'Greta Thunberg', bio: 'ACTIVIST · SWEDEN', score: 44800, delta: 1200 },
  { _id: 'farmer', displayName: 'Paul Farmer', bio: 'PHYSICIAN · USA / HAITI', score: 38200, delta: 680 },
  { _id: 'akshat', displayName: 'Akshat Chaturvedi', bio: 'FOUNDER · INDIA', score: 24180, delta: 2840 }
];

const worstFallback: LeaderRow[] = [
  { _id: 'leopold', displayName: 'King Leopold II', bio: 'COLONIAL · BELGIUM (HISTORICAL)', score: -2847000, historical: true },
  { _id: 'hitler', displayName: 'Adolf Hitler', bio: 'DICTATOR · GERMANY (HISTORICAL)', score: -8400000, historical: true },
  { _id: 'netanyahu', displayName: 'B. Netanyahu', bio: 'PM · ISRAEL', score: -840000, delta: -284000 },
  { _id: 'musk', displayName: 'Elon Musk', bio: 'CEO · USA', score: -124800, delta: -18400 }
];

function formatSigned(value: number) {
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toLocaleString()}`;
}

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function TopCard({ row, rank, featured = false }: { row: LeaderRow; rank: number; featured?: boolean }) {
  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center bg-surface/50 p-8 text-center transition-all group hover:bg-surface2/50",
      featured ? "border-2 border-brand-green/30" : "border border-border"
    )}>
      {featured && <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-[9px] text-brand-green">★ #1</div>}
      {!featured && <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] text-muted">#{rank}</div>}
      
      <div className={cn(
        "mt-4 flex h-14 w-14 items-center justify-center border font-serif text-3xl font-bold transition-colors",
        featured ? "border-brand-green/50 text-brand-green bg-brand-green/5" : "border-border text-muted group-hover:text-text"
      )}>
        {initials(row.displayName)}
      </div>
      
      <h2 className="mt-6 font-serif text-2xl font-bold text-white">{row.displayName}</h2>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[2px] text-muted">{row.bio}</p>
      
      <div className={cn(
        "mt-6 font-serif text-[40px] font-black leading-none",
        featured ? "text-brand-green" : "text-brand-green/70"
      )}>
        {formatSigned(row.score)}
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-muted/60">
        {row.historical ? 'Historical' : `↑ +${(row.delta ?? 0).toLocaleString()}`}
      </p>
    </div>
  );
}

function RankRow({ row, rank, negative = false }: { row: LeaderRow; rank: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bg/30 px-8 py-4 transition-colors hover:bg-surface/50">
      <div className="flex items-center gap-8">
        <span className={cn(
          "w-6 font-serif text-2xl font-bold",
          negative ? "text-brand-red/50" : "text-muted/50"
        )}>
          {rank}
        </span>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center border font-serif text-xl font-bold",
            negative ? "border-brand-red/20 text-brand-red/60 bg-brand-red/5" : "border-border text-muted bg-surface/50"
          )}>
            {initials(row.displayName)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/90">{row.displayName}</h3>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-muted/50">{row.bio}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-12 text-right">
        <div className={cn(
          "font-serif text-3xl font-black",
          negative ? "text-brand-red" : "text-brand-green"
        )}>
          {formatSigned(row.score)}
        </div>
        <div className={cn(
          "w-24 font-mono text-[10px] tracking-[1px]",
          negative ? "text-brand-red/60" : "text-brand-green/60"
        )}>
          {row.historical ? (
            <span className="text-muted/40 uppercase">Historical</span>
          ) : (
            <>
              {row.delta && row.delta > 0 ? '↑ ' : '↓ '}
              {Math.abs(row.delta ?? 0).toLocaleString()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const bestRows = bestFallback;
  const worstRows = worstFallback;

  const podium = [bestRows[1], bestRows[0], bestRows[2]];
  const tableRows = bestRows.slice(3);

  return (
    <main className="min-h-screen bg-bg">
      {/* Header */}
      <section className="flex flex-col gap-6 border-b border-border px-8 py-8 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-[44px] font-black leading-none text-white">Leaderboard</h1>
        <div className="flex gap-2">
          {['REGIONAL', 'NATIONAL', 'CONTINENTAL', 'GLOBAL'].map((scope) => (
            <button
              key={scope}
              className={cn(
                "border border-border px-6 py-2 font-mono text-[10px] uppercase tracking-[2px] text-muted transition-all hover:border-muted hover:text-text",
                scope === 'REGIONAL' && "border-muted text-text"
              )}
            >
              {scope}
            </button>
          ))}
        </div>
      </section>

      {/* Best Scores */}
      <section className="px-8 py-10">
        <div className="mb-10 flex items-center gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[4px] text-muted">Best Scores — Global</p>
          <div className="h-px flex-1 bg-border" />
        </div>
        
        <div className="grid gap-px bg-border lg:grid-cols-3">
          <TopCard row={podium[0]} rank={2} />
          <TopCard row={podium[1]} rank={1} featured />
          <TopCard row={podium[2]} rank={3} />
        </div>

        <div className="mt-8">
          {tableRows.map((row, index) => (
            <RankRow key={row._id} row={row} rank={index + 4} />
          ))}
        </div>
      </section>

      {/* Worst Scores */}
      <section className="px-8 pb-20">
        <div className="mb-10 flex items-center gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[4px] text-brand-red">Worst Scores — Global</p>
          <div className="h-px flex-1 bg-border" />
        </div>
        
        <div className="space-y-px">
          {worstRows.map((row, index) => (
            <RankRow key={row._id} row={row} rank={index + 1} negative />
          ))}
        </div>
      </section>
    </main>
  );
}
