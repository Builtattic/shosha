import { z } from 'zod';

// Firestore doc ids are strings like "x_someuser" or auto-generated 20-char ids,
// not 24-char Mongo ObjectIds. Validate as a generic safe id.
export const idSchema = z.string().min(1).max(200).regex(/^[A-Za-z0-9_.\-]+$/, 'Invalid id');
// Kept as an alias so legacy imports continue compiling during the migration.
export const objectIdSchema = idSchema;
export const platformSchema = z.enum(['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat', 'website']);
export const reportTypeSchema = z.enum(['positive', 'negative']);
export const userRoleSchema = z.enum(['user', 'moderator', 'editor', 'admin', 'super_admin']);
export const reportStatusSchema = z.enum(['pending_ai', 'ai_reviewed', 'approved', 'rejected', 'flagged']);
export const reportVisibilitySchema = z.enum(['public', 'hidden']);

export const accountCreateSchema = z.object({
  platform: platformSchema,
  username: z
    .string()
    .min(1)
    .max(100)
    .transform((value) =>
      value
        .replace(/^@/, '')
        .trim()
        .toLowerCase()
        .replace(/https?:\/\//g, '')
        .replace(/[^a-z0-9_.-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .refine((value) => value.length >= 2, 'Username must contain at least 2 safe characters.'),
  displayName: z.string().min(1).max(120).optional(),
  sourceUrl: z.string().url().optional(),
  skipDiscovery: z.boolean().optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  followers: z.string().max(24).optional(),
  verified: z.boolean().optional(),
  profileId: z.string().min(1).max(40).optional(),
  profileKind: z.enum(['standard', 'public_figure']).optional(),
  claimable: z.boolean().optional(),
  credibility: z.number().min(0).max(100).optional(),
  enrichmentStatus: z.enum(['none', 'pending', 'reviewed', 'stale']).optional(),
  role: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  quote: z.string().max(280).optional(),
  evidenceSummary: z.string().max(500).optional(),
  socialLinks: z.record(z.unknown()).optional(),
  email: z.string().email().max(200).optional(),
  socialUrl: z.string().url().optional(),
  additionalSocialLinks: z
    .array(
      z.object({
        platform: platformSchema,
        url: z.string().min(1).max(500)
      })
    )
    .optional()
});

export const accountPatchSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  followers: z.string().max(24).optional()
});

export const searchSchema = z.object({
  q: z.string().max(80).default('')
});

export const mediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video']),
  width: z.number().int().nonnegative().default(0),
  height: z.number().int().nonnegative().default(0),
  bytes: z.number().int().nonnegative(),
  publicId: z.string().optional()
});

export const workbookScaleSchema = z.enum(['0.5', '1', '1.5', '2', '2.5', '3']);

export const reportCreateSchema = z.object({
  accountId: idSchema,
  type: reportTypeSchema,
  category: z.string().min(1).max(120),
  deed: z.string().min(1).max(160),
  baseScore: z.number().int(),
  description: z.string().min(10).max(500),
  feelings: z.string().min(10).max(500),
  media: mediaSchema,
  repetitionPattern: workbookScaleSchema.default('1'),
  intent: workbookScaleSchema.default('1'),
  circumstances: workbookScaleSchema.default('1'),
  identity: z.string().optional(),
  power: z.string().optional(),
  means: z.string().optional(),
  environment: z.string().optional(),
  ability: z.string().optional(),
  responsibility: z.string().optional(),
  awareness: z.string().optional(),
  aiUndertaking: z.literal(true),
  location: z.string().max(160).optional(),
  tags: z.array(z.string().min(1).max(80)).max(10).optional()
});

export const adjudicateSchema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  finalImpact: z.number().int().min(-100000).max(100000),
  note: z.string().max(500).default(''),
  category: z.string().min(1).max(120).optional(),
  deed: z.string().min(1).max(160).optional(),
  baseScore: z.number().int().optional(),
  repetitionPattern: workbookScaleSchema.optional(),
  intent: workbookScaleSchema.optional(),
  circumstances: workbookScaleSchema.optional()
});

export const claimSchema = z.object({
  proofType: z.enum(['bio_code', 'dm_screenshot', 'oauth', 'wizard_flow']),
  proofPayload: z.record(z.unknown()).default({})
});

export const claimDecisionSchema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  note: z.string().max(500).default('')
});

export const auditRequestSchema = z.object({
  reason: z.string().max(500).default('')
});

export const disputeCreateSchema = z.object({
  reportId: idSchema,
  reason: z.string().min(10).max(500),
  evidenceUrl: z.string().url().max(500).optional()
});

export const disputeDecisionSchema = z.object({
  verdict: z.enum(['accepted', 'rejected']),
  note: z.string().max(500).default('')
});

export const uploadIntentSchema = z.object({
  type: z.enum(['image', 'video'])
});
