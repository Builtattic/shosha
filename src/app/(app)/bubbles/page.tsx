import * as bubblesRepo from '@/lib/repos/bubbles';
import { BubblesPanel } from '@/components/bubbles/BubblesPanel';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';

export const dynamic = 'force-dynamic';

export default async function BubblesPage() {
  const bubbles = await bubblesRepo.list(60).catch(() => []);
  const bubbleIds = bubbles.map((b) => b._id);
  const membersMap = await bubblesRepo.listMembersForBubbles(bubbleIds);
  const enriched = bubbles.map((bubble) => {
    const members = membersMap[bubble._id] ?? [];
    return {
      ...bubble,
      memberCount: members.length,
      topMembers: members.slice(0, 5),
    };
  });

  return (
    <>
      <MobileAppHeader />
      <BubblesPanel initialBubbles={enriched} />
    </>
  );
}
