import { v4 as uuid } from 'uuid';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { fail, ok } from '@/lib/api';
import { anonymousHash } from '@/lib/anonymous';
import { getCurrentUser } from '@/lib/auth';
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
  return (
    maybe.code === 404 ||
    maybe.errors?.some((item) => item.reason === 'notFound') ||
    maybe.message?.includes('bucket does not exist')
  );
}

/** Compress image to WebP using Sharp. Falls back to raw buffer if sharp isn't installed. */
async function compressImage(
  buffer: Buffer
): Promise<{ main: Buffer; thumb: Buffer; contentType: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp');
    const [main, thumb] = await Promise.all([
      sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
      sharp(buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 60 })
        .toBuffer(),
    ]);
    return { main, thumb, contentType: 'image/webp' };
  } catch {
    // sharp not installed — return raw buffer untouched
    return { main: buffer, thumb: buffer, contentType: 'image/jpeg' };
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

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
  if (!isImage && !isVideo)
    return fail('validation_error', 'Only image or video uploads are accepted.', 415);

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes)
    return fail('payload_too_large', `File exceeds ${maxBytes} bytes.`, 413);

  const rawExt = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const folder = isVideo ? 'video' : 'image';
  const actorId = user?._id ?? `anon_${anonymousHash(request).slice(0, 16)}`;
  const fileId = uuid();

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const originalBytes = rawBuffer.length;

  // Compress images to WebP; videos stored as-is
  let uploadBuffer = rawBuffer;
  let thumbBuffer: Buffer | null = null;
  let finalContentType = contentType;
  let finalExt = rawExt;

  if (isImage) {
    const compressed = await compressImage(rawBuffer);
    uploadBuffer = compressed.main;
    thumbBuffer = compressed.thumb;
    finalContentType = compressed.contentType;
    finalExt = compressed.contentType === 'image/webp' ? 'webp' : rawExt;
  }

  const filePath = `uploads/${actorId}/${folder}/${fileId}.${finalExt}`;
  const thumbPath =
    thumbBuffer ? `uploads/${actorId}/${folder}/${fileId}_thumb.webp` : null;

  let url: string;
  let thumbUrl: string | undefined;

  try {
    const bucket = adminBucket();

    const saveMain = bucket
      .file(filePath)
      .save(uploadBuffer, { contentType: finalContentType, resumable: false });
    const saveThumb =
      thumbBuffer && thumbPath
        ? bucket
            .file(thumbPath)
            .save(thumbBuffer, { contentType: 'image/webp', resumable: false })
        : Promise.resolve();

    await Promise.all([saveMain, saveThumb]);

    const toUrl = (p: string) =>
      process.env.FIREBASE_STORAGE_EMULATOR_HOST
        ? publicEmulatorUrl(p)
        : `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(p)}?alt=media`;

    url = toUrl(filePath);
    if (thumbPath) thumbUrl = toUrl(thumbPath);

    const saved = Math.round((1 - uploadBuffer.length / originalBytes) * 100);
    console.log(`[upload] ${originalBytes}B → ${uploadBuffer.length}B (${saved}% saved)`);
  } catch (error) {
    if (!isMissingBucketError(error) && process.env.NODE_ENV === 'production') {
      console.error('[POST /api/media/upload] Firebase Storage upload failed:', error);
      return fail(
        'upload_failed',
        'Evidence upload failed. Check Firebase Storage configuration.',
        500
      );
    }
    console.warn(
      '[POST /api/media/upload] Firebase Storage unavailable, using local upload fallback:',
      error
    );
    try {
      url = await saveLocalUpload(filePath, uploadBuffer);
      if (thumbBuffer && thumbPath) {
        thumbUrl = await saveLocalUpload(thumbPath, thumbBuffer);
      }
    } catch (localError) {
      console.error('[POST /api/media/upload] Local upload fallback failed:', localError);
      return fail(
        'upload_failed',
        'Evidence upload failed. Check Firebase Storage bucket configuration.',
        500
      );
    }
  }

  return ok({
    url,
    thumbUrl,
    type: isVideo ? 'video' : 'image',
    bytes: uploadBuffer.length,
    originalBytes,
    publicId: filePath,
  });
}
