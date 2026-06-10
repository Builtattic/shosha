import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { searchAccounts } from '@/api/accounts';

const RESERVED = new Set([
  'sign-in', 'onboard', 'dashboard', 'feed', 'profile', 'accounts', 'account',
  'reports', 'bubbles', 'people', 'admin', 'settings', 'search', 'bookmarks',
  'disputes', 'notifications', 'how-it-works', 'leaderboard', 'report-issue',
  'ranks', 'ranking', 'impact', 'access', 'trust-badge', 'subscribe', 'billing',
  'login', 'sign-up', 'onboarding',
]);

export default function SlugPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'not-found'>('loading');

  useEffect(() => {
    const normalized = slug.toLowerCase();
    if (!slug || RESERVED.has(normalized)) {
      setStatus('not-found');
      return;
    }

    let alive = true;
    searchAccounts(slug)
      .then((res) => {
        if (!alive) return;
        const match = res.data?.items.find(
          (a) => a.handle.toLowerCase() === normalized,
        );
        if (match) {
          navigate(`/accounts/${match.id}`, { replace: true });
        } else {
          setStatus('not-found');
        }
      })
      .catch(() => {
        if (alive) setStatus('not-found');
      });

    return () => { alive = false; };
  }, [slug, navigate]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Looking up profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Not Found</h1>
        <p className="text-muted-foreground">No profile matches &quot;{slug}&quot;.</p>
      </div>
    </main>
  );
}
