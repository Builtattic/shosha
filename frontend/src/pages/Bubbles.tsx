import { useEffect, useState } from 'react';
import BubblesPanel from '@/components/bubbles/BubblesPanel';
import { listBubbles } from '@/api/bubbles';
import type { Bubble } from '@/types/bubble';

export default function Bubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBubbles(60)
      .then(setBubbles)
      .catch(() => setBubbles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading…</div>;
  }

  return <BubblesPanel initialBubbles={bubbles} />;
}
