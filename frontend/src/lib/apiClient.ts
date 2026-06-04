import axios from 'axios';
import { getAuthorizationHeader } from '@/lib/firebaseAuth';

// Toggle this to switch between real backend and mock functions.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'; // Defaults to true if not explicitly disabled

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const existing =
    (typeof config.headers.get === 'function' && config.headers.get('Authorization')) ||
    config.headers.Authorization;
  if (existing) return config;

  const authHeaders = await getAuthorizationHeader();
  if (authHeaders.Authorization) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', authHeaders.Authorization);
    } else {
      config.headers.Authorization = authHeaders.Authorization;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body?.ok === true) {
      response.data = body.data;
      return response;
    }
    if (body?.ok === false) {
      throw body.error;
    }
    return response;
  },
  (error) => {
    const body = error.response?.data;
    if (body?.ok === false) throw body.error;
    if (body?.detail && Array.isArray(body.detail)) {
      const message = body.detail
        .map((d: { loc?: (string | number)[]; msg?: string }) => {
          const path = (d.loc ?? []).filter((x) => x !== 'body').join('.');
          return path ? `${path}: ${d.msg}` : String(d.msg);
        })
        .join('; ');
      throw new Error(message || 'Validation failed');
    }
    return Promise.reject(error);
  },
);
