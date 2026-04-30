import { z } from 'zod';

// Firestore doc ids are strings like "x_someuser" or auto-generated 20-char ids,
// not 24-char Mongo ObjectIds. Validate as a generic safe id.
export const idSchema = z.string().min(1).max(200).regex(/^[A-Za-z0-9_.\-]+$/, 'Invalid id');
// Kept as an alias so legacy imports continue compiling during the migration.
export const objectIdSchema = idSchema;
export const platformSchema = z.enum(['x', 'instagram', 'facebook', 'youtube', 'tiktok', 'linkedin', 'website']);
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
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  followers: z.string().max(24).optional(),
  verified: z.boolean().optional()
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

export const reportCreateSchema = z.object({
  accountId: idSchema,
  type: reportTypeSchema,
  description: z.string().min(10).max(500),
  feelings: z.string().min(10).max(500),
  media: mediaSchema
});

export const adjudicateSchema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  finalImpact: z.number().int().min(-10).max(10),
  note: z.string().max(500).default('')
});

export const claimSchema = z.object({
  proofType: z.enum(['bio_code', 'dm_screenshot', 'oauth']),
  proofPayload: z.record(z.unknown()).default({})
});

export const claimDecisionSchema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  note: z.string().max(500).default('')
});

export const auditRequestSchema = z.object({
  reason: z.string().max(500).default('')
});

export const uploadIntentSchema = z.object({
  type: z.enum(['image', 'video'])
});
