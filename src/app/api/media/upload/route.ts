import { v4 as uuid } from 'uuid';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { adminBucket } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function publicEmulatorUrl(filePath: string) {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'shosha-local.appspot.com';
  return `http://${host}/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
}

async function saveLocalUpload(filePath: string, buffer: Buffer) {
  const root = path.join(process.cwd(), 'public');
  const fullPath = path.join(root, filePath);
  if (!fullPath.startsWith(root)) throw new Error('Invalid upload path.');
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return `/${filePath.replace(/\\/g, '/')}`;
}

function isMissingBucketError(error: unknown) {
  const maybe = error as { code?: number; message?: string; errors?: Array<{ reason?: string }> };
  return maybe.code === 404 || maybe.errors?.some((item) => item.reason === 'notFound') || maybe.message?.includes('bucket does not exist');
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in before uploading evidence.', 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail('validation_error', 'Upload must be multipart/form-data.', 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return fail('validation_error', 'A file is required.', 400);

  const contentType = file.type || 'application/octet-stream';
  const isImage = contentType.startsWith('image/');
  const isVideo = contentType.startsWith('video/');
  if (!isImage && !isVideo) return fail('validation_error', 'Only image or video uploads are accepted.', 415);

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) return fail('payload_too_large', `File exceeds ${maxBytes} bytes.`, 413);

  const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
  const folder = isVideo ? 'video' : 'image';
  const filePath = `uploads/${user._id}/${folder}/${uuid()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  let url: string;
  try {
    const bucket = adminBucket();
    await bucket.file(filePath).save(buffer, { contentType, resumable: false });
    url = process.env.FIREBASE_STORAGE_EMULATOR_HOST
      ? publicEmulatorUrl(filePath)
      : `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
  } catch (error) {
    if (!isMissingBucketError(error) && process.env.NODE_ENV === 'production') {
      console.error('[POST /api/media/upload] Firebase Storage upload failed:', error);
      return fail('upload_failed', 'Evidence upload failed. Check Firebase Storage configuration.', 500);
    }
    console.warn('[POST /api/media/upload] Firebase Storage unavailable, using local upload fallback:', error);
    try {
      url = await saveLocalUpload(filePath, buffer);
    } catch (localError) {
      console.error('[POST /api/media/upload] Local upload fallback failed:', localError);
      return fail('upload_failed', 'Evidence upload failed. Check Firebase Storage bucket configuration.', 500);
    }
  }

  return ok({
    url,
    type: isVideo ? 'video' : 'image',
    bytes: file.size,
    publicId: filePath
  });
}
