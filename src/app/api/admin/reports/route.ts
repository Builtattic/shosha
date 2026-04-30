import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema, mediaSchema, reportStatusSchema, reportTypeSchema, reportVisibilitySchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as reportsRepo from '@/lib/repos/reports';
import { z } from 'zod';

const createSchema = z.object({
  accountId: idSchema,
  type: reportTypeSchema,
  description: z.string().min(10).max(500),
  feelings: z.string().max(500).default('Published by the Shosha admin team.'),
  media: mediaSchema,
  status: reportStatusSchema.default('approved'),
  finalImpact: z.number().int().min(-10).max(10).default(0),
  note: z.string().max(500).default('Admin-created feed claim.'),
  visibility: reportVisibilitySchema.default('public'),
  pinned: z.boolean().default(false),
  featured: z.boolean().default(false),
  stats: z.object({
    aligns: z.number().int().nonnegative().default(0),
    opposes: z.number().int().nonnegative().default(0),
    comments: z.number().int().nonnegative().default(0),
    shares: z.number().int().nonnegative().default(0),
  }).default({ aligns: 0, opposes: 0, comments: 0, shares: 0 }),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can create feed claims.', 403);
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  const account = await accountsRepo.findById(parsed.data.accountId);
  if (!account) return fail('not_found', 'No dossier exists for that claim.', 404);
  const now = new Date().toISOString();
  const adminDecision = parsed.data.status === 'approved'
    ? { adminId: user!._id, verdict: 'approved' as const, finalImpact: parsed.data.finalImpact, note: parsed.data.note, decidedAt: now }
    : null;
  const report = await reportsRepo.create({
    accountId: parsed.data.accountId,
    reporterId: user!._id,
    anonymousTag: user!.username,
    type: parsed.data.type,
    description: parsed.data.description,
    feelings: parsed.data.feelings,
    media: parsed.data.media,
    status: parsed.data.status,
    aiVerdict: null,
    adminDecision,
    visibility: parsed.data.visibility,
    pinned: parsed.data.pinned,
    featured: parsed.data.featured,
    createdByAdminId: user!._id,
    source: 'admin',
    stats: parsed.data.stats,
  });
  await adminActionsRepo.create({ actor: user!, action: 'report.create', entityType: 'report', entityId: report._id, after: report });
  return ok({ report, account }, 201);
}
