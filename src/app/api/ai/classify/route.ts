import { fail, ok } from '@/lib/api';
import { classifyReport } from '@/lib/gemini';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const classifySchema = z.object({
  description: z.string().min(10).max(500),
  geminiApiKey: z.string().optional(),
});

export async function POST(request: Request) {
  // Allow any authenticated user to use this for pre-filling their report
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'You must be signed in to use AI classification.', 401);

  const json = await request.json().catch(() => null);
  const parsed = classifySchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid payload.', 422);

  try {
    const result = await classifyReport(parsed.data.description, parsed.data.geminiApiKey);
    return ok(result);
  } catch (error) {
    return fail('analysis_failed', error instanceof Error ? error.message : 'AI classification failed.', 500);
  }
}
