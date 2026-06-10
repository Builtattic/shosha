import { apiClient } from '@/lib/apiClient';

export interface SearchReport {
  id: string;
  title: string | null;
  description: string;
  deed: string | null;
  base_score: number | null;
  status: string;
  created_at: string;
  account: {
    id: string;
    handle: string;
    platform: string;
    display_name: string | null;
    score: number;
  } | null;
}

export async function searchReports(q: string, limit = 30): Promise<SearchReport[]> {
  const res = await apiClient.get<{ reports: SearchReport[] }>(
    `/search/reports?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
  return res.data.reports;
}

export { searchAccounts } from '@/api/accounts';
