import { notFound } from 'next/navigation';
import * as bubblesRepo from '@/lib/repos/bubbles';
import * as accountsRepo from '@/lib/repos/accounts';
import { BubbleDetail } from '@/components/bubbles/BubbleDetail';
import { approvalThreshold } from '@/lib/bubbleRules';

export const dynamic = 'force-dynamic';

export default async function BubblePage({ params }: { params: { id: string } }) {
  const bubble = await bubblesRepo.findById(params.id);
  if (!bubble) notFound();

  const [members, requests, creator] = await Promise.all([
    bubblesRepo.listMembers(params.id),
    bubblesRepo.listJoinRequests(params.id),
    accountsRepo.findById(bubble.createdBy).catch(() => null),
  ]);

  // Enrich member data with account info
  const enrichedMembers = await Promise.all(
    members.map(async (m) => {
      const acc = await accountsRepo.findById(m.userId).catch(() => null);
      return {
        userId: m.userId,
        name: acc?.displayName || 'Unknown Member',
        avatar: acc?.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${m.userId}`,
        score: m.score,
        previousRank: m.previousRank,
        verified: acc?.verified,
      };
    })
  );

  // Enrich request data with account info
  const enrichedRequests = await Promise.all(
    requests.filter(r => r.status === 'pending').map(async (r) => {
      const acc = await accountsRepo.findById(r.userId).catch(() => null);
      return {
        id: r._id,
        userId: r.userId,
        name: acc?.displayName || 'Unknown User',
        avatar: acc?.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${r.userId}`,
        requestedAt: new Date(r.createdAt).toLocaleDateString(),
        mutualConnections: 0, // Placeholder
        approvals: r.approvals?.length || 0,
        rejections: r.rejections?.length || 0,
        threshold: approvalThreshold(members.length),
      };
    })
  );

  return (
    <BubbleDetail 
      bubble={{
        ...bubble,
        memberCount: members.length,
        creatorName: creator?.displayName || 'Unknown',
        creatorAvatar: creator?.avatarUrl || '',
      }} 
      members={enrichedMembers}
      requests={enrichedRequests}
    />
  );
}
