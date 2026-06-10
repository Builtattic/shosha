import { useEffect, useState } from 'react';
import PeopleSwipeDeck from '@/components/people/PeopleSwipeDeck';
import { getPeopleDeck } from '@/api/people';
import type { DeckItem } from '@/types/people';

export default function People() {
  const [initialItems, setInitialItems] = useState<DeckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPeopleDeck(0, { limit: 10 })
      .then((res) => setInitialItems(res.items))
      .catch(() => setInitialItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading…</div>;
  }

  return <PeopleSwipeDeck initialItems={initialItems} />;
}
