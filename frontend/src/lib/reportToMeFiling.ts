import type { MeFiling } from '@/api/me';
import type { ReportListItem } from '@/api/accounts';

export function reportToMeFiling(r: ReportListItem): MeFiling {
  const baseScore = r.base_score ?? 0;
  return {
    id: r.id,
    title: r.title ?? r.deed ?? r.description ?? null,
    category: r.deed ?? r.title ?? null,
    delta: baseScore,
    type: r.type ?? (baseScore > 0 ? 'positive' : baseScore < 0 ? 'negative' : 'neutral'),
    status: r.status,
    created_at: r.created_at,
  };
}
