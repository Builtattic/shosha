import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BubbleDetailComponent from '@/components/bubbles/BubbleDetail';
import { getBubbleDetail } from '@/api/bubbles';
import { useAuth } from '@/providers/AuthProvider';
import type { BubbleDetail } from '@/types/bubble';

export default function BubbleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [bubble, setBubble] = useState<BubbleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBubbleDetail(id)
      .then(setBubble)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading…</div>;
  }

  if (error || !bubble) {
    return <div className="p-8 text-center text-red-500">Bubble not found.</div>;
  }

  return (
    <BubbleDetailComponent bubble={bubble} currentUserId={profile?.id ?? null} />
  );
}
