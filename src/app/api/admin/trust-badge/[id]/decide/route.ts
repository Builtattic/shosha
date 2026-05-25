import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as usersRepo from '@/lib/repos/users';
import * as accountsRepo from '@/lib/repos/accounts';
import * as notificationsRepo from '@/lib/repos/notifications';
import { calcCredibility } from '@/lib/credibility';

const decideSchema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await getCurrentUser();
  if (!admin || !isAdmin(admin)) return fail('forbidden', 'Admin only.', 403);

  const target = await usersRepo.findById(params.id);
  if (!target) return fail('not_found', 'User not found.', 404);
  if (!target.trustBadgePending) return fail('validation_error', 'No pending submission.', 400);

  const json = await request.json().catch(() => null);
  const parsed = decideSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid payload.', 422);

  const { verdict, note } = parsed.data;

  if (verdict === 'approved') {
    const merged = { ...target, trustBadge: true } as Record<string, unknown>;
    const cred = calcCredibility({
      name: merged.name as string | undefined,
      username: merged.username as string | undefined,
      phone: merged.phone as string | undefined,
      dob: merged.dob as string | undefined,
      city: merged.city as string | undefined,
      country: merged.country as string | undefined,
      occupationRole: merged.occupationRole as string | undefined,
      networkSize: merged.networkSize as string | undefined,
      education: merged.education as string | undefined,
      specializedField: merged.specializedField as string | undefined,
      managesMoneyPeopleSystem: merged.managesMoneyPeopleSystem as string | undefined,
      physicalIntellectualLimitations: merged.physicalIntellectualLimitations as string | undefined,
      igUrl: merged.igUrl as string | undefined,
      tiktokUrl: merged.tiktokUrl as string | undefined,
      xUrl: merged.xUrl as string | undefined,
      linkedinUrl: merged.linkedinUrl as string | undefined,
      redditUrl: merged.redditUrl as string | undefined,
      ytUrl: merged.ytUrl as string | undefined,
      fbUrl: merged.fbUrl as string | undefined,
      snapchatUrl: merged.snapchatUrl as string | undefined,
      photoUrl: merged.photoUrl as string | undefined,
      bio: merged.bio as string | undefined,
      quote: merged.quote as string | undefined,
      trustBadge: true,
    });

    await usersRepo.update(target._id, {
      trustBadge: true,
      trustBadgeAt: new Date().toISOString(),
      trustBadgePending: false,
      trustBadgeRejectedAt: '',
      trustBadgeRejectionReason: '',
      credibility: cred.total,
    });

    const claimed = await accountsRepo.listClaimedBy(target._id);
    const websiteAccount = claimed.find((account) => account.platform === 'website');
    if (websiteAccount) {
      await accountsRepo.update(websiteAccount._id, {
        trustBadge: true,
        credibility: 100,
      });
    }

    await notificationsRepo.create({
      userId: target._id,
      kind: 'trust_badge_approved',
      title: 'Trust Badge Approved',
      body: 'Your identity has been verified. Your Trust Badge is now active.',
      link: '/profile',
    });
  } else {
    await usersRepo.update(target._id, {
      trustBadgePending: false,
      trustBadgeRejectedAt: new Date().toISOString(),
      trustBadgeRejectionReason: note ?? 'Verification could not be completed.',
    });

    await notificationsRepo.create({
      userId: target._id,
      kind: 'trust_badge_rejected',
      title: 'Trust Badge Not Approved',
      body: note ?? 'We could not verify your identity. Please contact support.',
      link: '/profile/upgrade',
    });
  }

  return ok({ verdict });
}
