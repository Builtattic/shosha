import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/media';
import type { ApiResponse } from '@/types/common';
import type { MediaUploadData } from '@/mocks/media';

export type { MediaUploadData };

const real = {
  uploadMedia: async (file: File): Promise<ApiResponse<MediaUploadData>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

export const uploadMedia = USE_MOCKS ? mock.uploadMedia : real.uploadMedia;
