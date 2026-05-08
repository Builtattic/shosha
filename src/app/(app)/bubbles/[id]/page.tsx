import { notFound } from 'next/navigation';
import * as bubblesRepo from '@/lib/repos/bubbles';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import { BubbleDetail } from '@/components/bubbles/BubbleDetail';
import { approvalThreshold } from '@/lib/bubbleRules';
import { getCurrentUser } from '@/lib/auth';
import { resolveAvatarUrl } from '@/lib/media';

export const dynamic = 'force-dynamic';

async function resolveBubblePerson(userId: string) {
  const [account, user] = await Promise.all([
    accountsRepo.findById(userId).catch(() => null),
    usersRepo.findById(userId).catch(() => null),
  ]);
  const websiteAccount = !account && user?.username
    ? await accountsRepo.findById(accountsRepo.deriveId('website', user.username)).catch(() => null)
    : null;
  const profile = account ?? websiteAccount;
  const name = profile?.displayName || user?.name || user?.username || 'ShoSha Member';

  return {
    accountId: profile?._id ?? account?._id ?? null,
    claimedAccounts: user?.claimedAccounts ?? [],
    connections: Array.from(new Set([...(user?.followers ?? []), ...(user?.following ?? [])])),
    name,
    username: profile?.username || user?.username || userId,
    avatar: resolveAvatarUrl(profile?.avatarUrl || user?.photoUrl, name),
    score: Math.round(profile?.displayScore ?? profile?.score ?? user?.score ?? 0),
    verified: Boolean(profile?.verified || user),
  };
}

function mutualCount(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const left = new Set(a);
  return b.reduce((count, id) => count + (left.has(id) ? 1 : 0), 0);
}

export default async function BubblePage({ params }: { params: { id: string } }) {
  const bubble = await bubblesRepo.findById(params.id);
  if (!bubble) notFound();

  const [members, requests, creator, user] = await Promise.all([
    bubblesRepo.listMembers(params.id),
    bubblesRepo.listJoinRequests(params.id),
    accountsRepo.findById(bubble.createdBy).catch(() => null),
    getCurrentUser().catch(() => null),
  ]);
  const creatorUser = creator ? null : await usersRepo.findById(bubble.createdBy).catch(() => null);
  const currentProfile = user ? await resolveBubblePerson(user._id) : null;

  // Enrich member data with account info
  const enrichedMembers = await Promise.all(
    members.map(async (m) => {
      const person = await resolveBubblePerson(m.userId);
      return {
        userId: m.userId,
        name: person.name,
        username: person.username,
        avatar: person.avatar,
        score: m.score || person.score,
        previousRank: m.previousRank,
        verified: person.verified,
      };
    })
  );

  // Enrich request data with account info
  const enrichedRequests = await Promise.all(
    requests.filter(r => r.status === 'pending').map(async (r) => {
      const person = await resolveBubblePerson(r.userId);
      return {
        id: r._id,
        userId: r.userId,
        name: person.name,
        username: person.username,
        avatar: person.avatar,
        requestedAt: r.createdAt,
        mutualConnections: currentProfile ? mutualCount(currentProfile.connections, person.connections) : 0,
        approvals: r.approvals?.length || 0,
        rejections: r.rejections?.length || 0,
        threshold: approvalThreshold(members.length),
      };
    })
  );

  const memberProfiles = await Promise.all(members.map((m) => resolveBubblePerson(m.userId)));
  const reportAccountIds = Array.from(new Set(
    memberProfiles.flatMap((person) => [person.accountId, ...person.claimedAccounts]).filter(Boolean) as string[]
  ));
  const reportsByAccount = await Promise.all(
    reportAccountIds.slice(0, 12).map(async (accountId) => {
      const [account, reports] = await Promise.all([
        accountsRepo.findById(accountId).catch(() => null),
        reportsRepo.listForAccount(accountId, ['approved', 'ai_reviewed'], 4).catch(() => []),
      ]);
      return reports.map((report) => ({
        id: report._id,
        accountName: account?.displayName || 'Tracked profile',
        accountAvatar: resolveAvatarUrl(account?.avatarUrl, account?.displayName || accountId),
        type: report.type,
        description: report.description,
        category: report.category || report.deed || 'Community report',
        score: report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? report.reportScore ?? 0,
        createdAt: report.createdAt || report.updatedAt || '',
      }));
    })
  );
  const activityReports = reportsByAccount
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <BubbleDetail 
      bubble={{
        ...bubble,
        memberCount: members.length,
        creatorName: creator?.displayName || creatorUser?.name || creatorUser?.username || 'ShoSha Member',
        creatorAvatar: resolveAvatarUrl(creator?.avatarUrl || creatorUser?.photoUrl, creator?.displayName || creatorUser?.name || 'ShoSha Member'),
      }} 
      currentUser={user ? { _id: user._id, username: user.username } : null}
      members={enrichedMembers}
      requests={enrichedRequests}
      reports={activityReports}
    />
  );
}
