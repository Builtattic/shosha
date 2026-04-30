import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin, isSuperAdmin } from '@/lib/auth';
import { platformSchema } from '@/lib/validators';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as siteSettingsRepo from '@/lib/repos/siteSettings';
import { z } from 'zod';

const patchSchema = z.object({
  allowAiReviewedInFeed: z.boolean().optional(),
  allowFlaggedInFeed: z.boolean().optional(),
  feedRankingMode: z.enum(['smart', 'recent']).optional(),
  enabledPlatforms: z.array(platformSchema).optional(),
  scoreImpactMin: z.number().int().min(-100).max(100).optional(),
  scoreImpactMax: z.number().int().min(-100).max(100).optional(),
  uploadMaxBytes: z.number().int().positive().optional(),
  liveFeedEnabled: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can inspect settings.', 403);
  return ok(await siteSettingsRepo.get());
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) return fail('forbidden', 'Only super admins can modify settings.', 403);
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  const before = await siteSettingsRepo.get();
  const after = await siteSettingsRepo.update(parsed.data);
  await adminActionsRepo.create({ actor: user!, action: 'settings.update', entityType: 'settings', entityId: 'current', before, after });
  return ok(after);
}
