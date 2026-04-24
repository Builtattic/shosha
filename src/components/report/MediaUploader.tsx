'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Replace } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export type UploadedMedia = {
  publicId: string;
  url: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  bytes: number;
};

export function MediaUploader({
  value,
  onChange
}: {
  value: UploadedMedia | null;
  onChange: (media: UploadedMedia | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function upload(file: File) {
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const max = type === 'video' ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > max) {
      toast.push(type === 'video' ? 'Video proof must stay under 25MB.' : 'Image proof must stay under 8MB.');
      return;
    }
    if (type === 'video' && !['video/mp4', 'video/webm'].includes(file.type)) {
      toast.push('Video proof must be mp4 or webm.');
      return;
    }
    if (type === 'image' && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.push('Image proof must be jpg, png, or webp.');
      return;
    }

    setUploading(true);
    setLocalPreview(URL.createObjectURL(file));
    try {
      const signResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const signed = await signResponse.json();
      if (!signed.ok) throw new Error(signed.error.message);

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', signed.data.apiKey);
      form.append('timestamp', String(signed.data.timestamp));
      form.append('folder', signed.data.folder);
      form.append('signature', signed.data.signature);
      if (signed.data.transformation) form.append('transformation', signed.data.transformation);
      if (signed.data.eager) form.append('eager', signed.data.eager);
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signed.data.cloudName}/${signed.data.resourceType}/upload`;
      const cloudinaryResponse = await fetch(cloudinaryUrl, { method: 'POST', body: form });
      const result = await cloudinaryResponse.json();
      if (!cloudinaryResponse.ok) throw new Error(result.error?.message ?? 'Upload failed');
      onChange({
        publicId: result.public_id,
        url: result.secure_url,
        type,
        width: result.width ?? 0,
        height: result.height ?? 0,
        bytes: result.bytes ?? file.size
      });
      toast.push('Evidence attached to the file.');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Evidence upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const preview = value?.url ?? localPreview;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-32 w-full items-center justify-center border border-dashed border-border bg-dim p-4 text-sm uppercase text-muted"
      >
        <ImagePlus className="mr-2" size={18} />
        {uploading ? 'Attaching evidence' : value ? 'Evidence attached' : 'Attach media proof'}
      </button>
      {preview ? (
        <div className="border border-border bg-raised p-2">
          {value?.type === 'video' ? (
            <video src={preview} className="max-h-64 w-full object-contain" controls />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Evidence preview" className="max-h-64 w-full object-contain" />
          )}
          <Button type="button" variant="secondary" className="mt-2 w-full" onClick={() => inputRef.current?.click()}>
            <Replace size={16} />
            Replace
          </Button>
        </div>
      ) : null}
    </div>
  );
}
