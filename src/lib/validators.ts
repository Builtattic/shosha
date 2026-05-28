import { z } from 'zod';

export const userUsernameSchema = z
  .string()
  .min(1, 'Username is required')
  .transform((val) => val.replace(/^@+/, '').trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(
        /^[a-zA-Z0-9][a-zA-Z0-9._]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/,
        'Username can only contain letters, numbers, underscores, and periods'
      )
      .refine(
        (val) => !/([._]){2,}/.test(val) && !/(\.\_|\_\.)/.test(val),
        'Username cannot have consecutive special characters'
      )
  );

// Standalone format check for client-side (no async, no DB)
export function validateUsernameFormat(raw: string): string | null {
  const result = userUsernameSchema.safeParse(raw);
  if (result.success) return null;
  return result.error.errors[0]?.message ?? 'Invalid username';
}

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
const httpUrlSchema = z
  .string()
  .max(500)
  .url('Must be a valid URL')
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must start with http:// or https://');

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
  profileId: z.string().min(1).max(200).optional(),
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
    .optional(),
  profileUserType: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  dob: z.string().max(32).optional(),
  age: z.coerce.number().int().min(0).max(150).optional(),
  cityCountry: z.string().max(160).optional(),
  educationWorkbook: z.string().max(120).optional(),
  specializedFieldWorkbook: z.string().max(120).optional(),
  managementWorkbook: z.string().max(160).optional(),
  disability: z.string().max(80).optional(),
  lifestyle: z.string().max(80).optional(),
  reach: z.string().max(80).optional(),
  profileCompletion: z.coerce.number().min(0).max(100).optional(),
  socialPostCount: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  opposedPosts: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  aiFlaggedPosts: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  disputedPosts: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  disputesLost: z.coerce.number().int().min(0).max(1_000_000_000).optional()
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
  thumbUrl: z.string().url().optional(),
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
  aiUndertaking: z.literal(true),
  publicAnonymous: z.boolean().default(false),
  location: z.string().max(160).optional(),
  tags: z.array(z.string().min(1).max(80)).max(10).optional(),
  isIRL: z.boolean().default(false),
  evidenceSourceUrl: httpUrlSchema.optional(),
  links: z.array(
    z.object({
      url: httpUrlSchema,
      title: z.string().max(120).optional(),
    })
  ).max(10).optional(),
}).superRefine((data, ctx) => {
  if (!data.isIRL && !data.evidenceSourceUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['evidenceSourceUrl'],
      message: 'Proof source URL is required for online reports.',
    });
  }
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
  disputeType: z.enum(['factual_inaccuracy', 'outdated_information', 'missing_context', 'mistaken_identity', 'evidence_fabricated']).optional(),
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
