import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const platformSchema = z.enum(['x', 'instagram']);
export const reportTypeSchema = z.enum(['positive', 'negative']);

export const signupSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).transform((value) => value.toLowerCase()),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

export const accountCreateSchema = z.object({
  platform: platformSchema,
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_.]+$/).transform((value) => value.toLowerCase()),
  displayName: z.string().min(1).max(80).optional()
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
  publicId: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['image', 'video']),
  width: z.number().int().nonnegative().default(0),
  height: z.number().int().nonnegative().default(0),
  bytes: z.number().int().nonnegative()
});

export const reportCreateSchema = z.object({
  accountId: objectIdSchema,
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
