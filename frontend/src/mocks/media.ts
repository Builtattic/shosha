import type { ApiResponse } from '@/types/common';

export interface MediaUploadData {
  url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  size_bytes: number;
}

export async function uploadMedia(file: File): Promise<ApiResponse<MediaUploadData>> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  const isVideo = file.type.startsWith('video/');
  const objectUrl = URL.createObjectURL(file);
  
  return {
    ok: true,
    data: {
      url: objectUrl, // Mock URL
      thumbnail_url: isVideo ? null : objectUrl,
      media_type: isVideo ? 'video' : 'image',
      size_bytes: file.size,
    },
  };
}
