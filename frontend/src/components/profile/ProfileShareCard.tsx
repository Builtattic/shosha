export interface ProfileShareCardProps {
  displayName: string | null;
  username: string;
  score: number;
  platform?: string;
  bio?: string | null;
  totalFilings?: number;
}

export default function ProfileShareCard({
  displayName,
  username,
  score,
  platform,
  bio,
  totalFilings,
}: ProfileShareCardProps) {
  const name = displayName ?? username;
  const initial = name.replace(/^@/, '')[0]?.toUpperCase() ?? '?';

  return (
    <div
      id="profile-share-card"
      className="box-border flex flex-col bg-zinc-900 text-white"
      style={{ width: 400, minHeight: 500, padding: 24 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <span className="text-lg font-black tracking-tight">Shosha</span>
        <span className="text-[10px] uppercase tracking-widest text-zinc-400">
          Social Accountability
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-2xl font-black">
          {initial}
        </div>
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-sm text-zinc-400">@{username.replace(/^@/, '')}</p>
        {platform && (
          <span className="mt-2 rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-semibold capitalize text-zinc-300">
            {platform}
          </span>
        )}
      </div>

      <div className="my-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Shosha Score
        </p>
        <p className="mt-1 text-4xl font-black tabular-nums text-green-400">
          {Math.round(score).toLocaleString()}
        </p>
        {typeof totalFilings === 'number' && (
          <p className="mt-2 text-xs text-zinc-400">{totalFilings} filings</p>
        )}
      </div>

      {bio && (
        <p className="mb-6 line-clamp-3 text-center text-sm leading-relaxed text-zinc-300">
          {bio}
        </p>
      )}

      <div className="mt-auto border-t border-zinc-800 pt-4 text-center text-xs text-zinc-500">
        shosha.app
      </div>
    </div>
  );
}
