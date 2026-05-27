import { fail, ok } from '@/lib/api';
import { adjudicateReport } from '@/lib/gemini';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { rateLimits, assertLimit } from '@/lib/ratelimit';
import { reportTypeSchema } from '@/lib/validators';
import { z } from 'zod';

const analyzeSchema = z.object({
  accountId: z.string().min(1).optional(),
  accountDisplayName: z.string().min(1).max(160).optional(),
  platform: z.string().max(40).optional(),
  type: reportTypeSchema,
  description: z.string().min(10).max(500),
  feelings: z.string().min(1).max(500).default('Direct tribunal analysis.'),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return fail('forbidden', 'Only tribunal staff can run direct analysis.', 403);

  const aiLimit = await assertLimit(rateLimits.analyzeAi, user._id);
  if (!aiLimit.allowed) {
    return fail('rate_limited', 'Analysis limit reached. Try again later.', 429);
  }

  const json = await request.json().catch(() => null);
  const parsed = analyzeSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Analysis payload is incomplete.', 422);
  const verdict = await adjudicateReport({
    description: parsed.data.description,
    feelings: parsed.data.feelings,
    type: parsed.data.type,
    accountDisplayName: parsed.data.accountDisplayName ?? parsed.data.accountId ?? 'Unknown account',
    platform: parsed.data.platform ?? 'unknown',
    mediaUrl: parsed.data.mediaUrl,
    mediaType: parsed.data.mediaType,
  });
  return ok(verdict);
}
