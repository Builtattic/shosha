import { apiClient } from '@/lib/apiClient';

export interface ImpactReport {
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

export interface RisingMaker {
  id: string;
  display_name: string | null;
  handle: string;
  platform: string;
  score: number;
  weekly_delta: number;
}

export async function getImpact(): Promise<{
  top_stories: ImpactReport[];
  recent_reports: ImpactReport[];
}> {
  const res = await apiClient.get('/impact');
  return res.data;
}

export async function getRisingMakers(): Promise<RisingMaker[]> {
  const res = await apiClient.get<{ rising_makers: RisingMaker[] }>('/impact/rising-makers');
  return res.data.rising_makers;
}

export async function getPublicStats(): Promise<{
  accounts_tracked: number;
  events_today: number;
  events_total: number;
  events_last_7: number;
  avg_weekly_delta: number;
  net_momentum: number;
}> {
  const res = await apiClient.get('/stats');
  return res.data;
}
