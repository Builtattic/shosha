import axios from 'axios';

// Toggle this to switch between real backend and mock functions.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'; // Defaults to true if not explicitly disabled

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optionally add interceptors to inject Firebase token here later
