import { createSignedUpload } from '@/lib/cloudinary';
import { fail, fromZod, ok } from '@/lib/api';
import { uploadIntentSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = uploadIntentSchema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return fail('cloudinary_not_configured', 'Cloudinary signing is not configured yet.', 503);
  }
  return ok(createSignedUpload(parsed.data.type));
}
