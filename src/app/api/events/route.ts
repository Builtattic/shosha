import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { anonymousTag } from '@/lib/anonymous';
import * as eventsRepo from '@/lib/repos/events';
import * as accountsRepo from '@/lib/repos/accounts';
import * as subscriptionsRepo from '@/lib/repos/subscriptions';
import {
  DEFAULT_MULTIPLIERS,
  applySheetScore,
  calcDelta,
  calcMultiplierQuotient,
  resolveSheetBaseImpact,
  type EventMultipliers,
} from '@/lib/scoring';
import { z } from 'zod';

const eventCreateSchema = z.object({
  subjectId: z.string().min(1),
  eventType: z.enum(['positive', 'negative']),
  description: z.string().min(10).max(1000),
  baseImpactKey: z.string().min(1).default('default'),
  proofLinks: z.array(z.string()).default([]),
  location: z.string().max(200).default('Global'),
  multipliers: z.object({
    identity: z.number().min(0.5).max(3).optional(),
    power: z.number().min(0.5).max(3).optional(),
    means: z.number().min(0.5).max(3).optional(),
    environment: z.number().min(0.5).max(3).optional(),
    awareness: z.number().min(0.5).max(3).optional(),
    ability: z.number().min(0.5).max(3).optional(),
    circumstances: z.number().min(0.5).max(3).optional(),
    responsibility: z.number().min(0.5).max(3).optional(),
    intent: z.number().min(0.5).max(3).optional(),
    reputation: z.number().min(0.5).max(3).optional(),
  }).optional(),
  isAnonymous: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));

    if (accountId) {
      const events = await eventsRepo.listForAccount(accountId, limit);
      return ok(events);
    }

    const events = await eventsRepo.listPublicFeed(limit);
    const accountIds = Array.from(new Set(events.map((e) => e.subjectId)));
    const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
    const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));

    const enriched = events
      .map((e) => ({ ...e, account: accountMap.get(e.subjectId) ?? null }))
      .filter((e) => e.account !== null);

    return ok(enriched);
  } catch (err) {
    console.error('[GET /api/events]', err);
    return ok([]); // Return empty array instead of 500 to avoid JSON parse crashes
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    const json = await request.json().catch(() => null);
    const parsed = eventCreateSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return fail('validation_error', first?.message ?? 'Invalid event data.', 422);
    }

    // Rate limit check
    if (user) {
      const can = await subscriptionsRepo.canReport(user._id);
      if (!can.allowed) {
        return fail('rate_limited', `Daily limit reached (${can.tier}). ${can.remaining} remaining.`, 429);
      }
    }

    // Verify account exists
    const account = await accountsRepo.findById(parsed.data.subjectId);
    if (!account) return fail('not_found', 'No profile found for this event subject.', 404);

    // Resolve base impact from the sheet scoring index.
    const scoringRow = resolveSheetBaseImpact(parsed.data.baseImpactKey, parsed.data.eventType);
    const baseImpact = scoringRow.baseScore;

    // Merge multipliers
    const multipliers: EventMultipliers = { ...DEFAULT_MULTIPLIERS, ...(parsed.data.multipliers ?? {}) };

    // Compute delta
    const multiplierQuotient = calcMultiplierQuotient(multipliers);
    const delta = calcDelta(baseImpact, multipliers);
    const scoreBefore = account.score ?? 1000;
    const { score: scoreAfter, decay } = applySheetScore(scoreBefore, delta);

    // Deduplication check
    const duplicate = await eventsRepo.findDuplicate(parsed.data.subjectId, parsed.data.description);
    if (duplicate) {
      return ok({ ...duplicate, isDuplicate: true, message: 'Similar event already exists in 24h window.' });
    }

    // Create event
    const event = await eventsRepo.create({
      subjectId: parsed.data.subjectId,
      reporterId: parsed.data.isAnonymous ? null : (user?._id ?? null),
      anonymousTag: user?.username ?? anonymousTag(request),
      eventType: parsed.data.eventType,
      description: parsed.data.description,
      baseImpactKey: parsed.data.baseImpactKey,
      baseImpact,
      multipliers,
      multiplierQuotient,
      delta,
      scoreBefore,
      scoreAfter,
      decay,
      category: scoringRow.category,
      deed: scoringRow.deed,
      formulaVersion: 'sheet-v1',
      proofLinks: parsed.data.proofLinks,
      location: parsed.data.location,
      timestamp: new Date().toISOString(),
      status: 'pending',
      aiVerdict: null,
      adminDecision: null,
      stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    });

    // Update account score
    await accountsRepo.update(account._id, {
      score: scoreAfter,
      scoreHistory: [
        ...(account.scoreHistory ?? []),
        {
          t: new Date().toISOString(),
          s: scoreAfter,
          cause: 'report' as const,
          delta,
          baseScore: baseImpact,
          multiplierQuotient,
          decay,
          category: scoringRow.category,
          deed: scoringRow.deed,
          multipliers,
        },
      ],
    });

    // Increment usage
    if (user) await subscriptionsRepo.incrementDailyReport(user._id);

    return ok({ ...event, account: { ...account, score: scoreAfter } }, 201);
  } catch (err) {
    console.error('[POST /api/events]', err);
    return fail('server_error', 'Failed to create event. Ensure Firestore is running.', 500);
  }
}
