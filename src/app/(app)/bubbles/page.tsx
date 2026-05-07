import * as bubblesRepo from '@/lib/repos/bubbles';
import { BubblesPanel } from '@/components/bubbles/BubblesPanel';

export const dynamic = 'force-dynamic';

export default async function BubblesPage() {
  const bubbles = await bubblesRepo.list(60).catch(() => []);
  const enriched = await Promise.all(
    bubbles.map(async (bubble) => {
      const members = await bubblesRepo.listMembers(bubble._id).catch(() => []);
      return { ...bubble, memberCount: members.length, topMembers: members.slice(0, 5) };
    })
  );

  return <BubblesPanel initialBubbles={enriched} />;
}
