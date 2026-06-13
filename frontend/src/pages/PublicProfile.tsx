import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAccount } from '@/api/accounts';
import type { Account } from '@/types/account';
import { clearOgImage, setOgImage } from '@/lib/ogMeta';

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    getAccount(id)
      .then((res) => {
        if (!alive) return;
        if (res.ok && res.data?.account) {
          setAccount(res.data.account);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (alive) setNotFound(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (account?.id) setOgImage(account.id);
    return () => clearOgImage();
  }, [account?.id]);

  if (loading) {
    return (
      <main className="max-w-[720px] mx-auto px-6 py-12">
        <p className="text-muted-foreground">Loading profile...</p>
      </main>
    );
  }

  if (notFound || !account) {
    return (
      <main className="max-w-[720px] mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold mb-2">Profile Not Found</h1>
        <p className="text-muted-foreground">This profile could not be found on Shosha.</p>
      </main>
    );
  }

  const displayName = account.display_name ?? account.handle;
  const score = account.score;

  return (
    <main className="max-w-[720px] mx-auto px-6 py-12 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={`https://api.dicebear.com/9.x/initials/svg?seed=${account.handle}`}
          alt=""
          className="w-16 h-16 rounded-full border border-border"
        />
        <div>
          <h1 className="text-[32px] font-semibold leading-tight">{displayName}</h1>
          <p className="text-muted-foreground">
            {account.platform} · @{account.handle}
          </p>
        </div>
      </div>

      <section aria-labelledby="score-heading" className="mb-8">
        <h2 id="score-heading" className="text-lg font-medium mb-2">Shosha™ Score</h2>
        <p className="text-5xl font-bold">{score.toLocaleString()}</p>
        <p className="text-muted-foreground text-sm mt-2">
          Algorithmically calculated from verified real-world actions, weighted
          by context factors including role, intent, and power held.
        </p>
      </section>

      {account.bio && (
        <section aria-labelledby="bio-heading" className="mb-8">
          <h2 id="bio-heading" className="text-lg font-medium mb-2">About</h2>
          <p className="leading-relaxed text-foreground/80">{account.bio}</p>
        </section>
      )}

      <section aria-labelledby="faq-heading" className="mb-10">
        <h2 id="faq-heading" className="text-lg font-medium mb-4">Common questions</h2>

        <div className="mb-4">
          <h3 className="text-[15px] font-medium mb-1">What is {displayName}&apos;s Shosha score?</h3>
          <p className="text-foreground/70 leading-relaxed">
            {displayName}&apos;s current Shosha score is {score.toLocaleString()}. Calculated from verified actions
            weighted against context factors including role, intent, and power held at the time.
          </p>
        </div>

        <div className="mb-4">
          <h3 className="text-[15px] font-medium mb-1">How is {displayName}&apos;s score calculated?</h3>
          <p className="text-foreground/70 leading-relaxed">
            Every verified action generates a score delta, weighted against ten context factors.{' '}
            <Link to="/how-it-works" className="underline">Learn how Shosha scores work →</Link>
          </p>
        </div>
      </section>

      <div className="bg-muted/40 rounded-lg p-6 text-center">
        <p className="font-medium mb-2">See the full ledger for {displayName}</p>
        <p className="text-muted-foreground text-sm mb-4">
          Sign in to view verified events, score history, impact breakdown, and more.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/accounts/${account.id}`)}
          className="bg-foreground text-background px-6 py-2.5 rounded-md text-sm font-medium"
        >
          Open full profile →
        </button>
      </div>
    </main>
  );
}
