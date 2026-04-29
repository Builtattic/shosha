import { ok } from '@/lib/api';
import * as reportsRepo from '@/lib/repos/reports';

const CATEGORY_COLORS: Record<string, string> = {
  authenticity: '#7eb89a',
  engagement: '#60a5fa',
  community: '#a78bfa',
  content: '#fb923c',
  impact: '#f472b6',
  harassment: '#f87171',
  misinformation: '#facc15',
  philanthropy: '#34d399',
  professionalism: '#38bdf8',
  controversy: '#fb7185'
};

export async function GET() {
  const reports = await reportsRepo.listAll(500).catch(() => []);

  let positive = 0;
  let negative = 0;
  let flagged = 0;
  const categoryCounts = new Map<string, number>();

  for (const report of reports) {
    if (report.type === 'positive') positive += 1;
    else if (report.type === 'negative') negative += 1;
    if (report.status === 'flagged') flagged += 1;
    const tags = report.aiVerdict?.categoryTags ?? [];
    for (const tag of tags) {
      const key = String(tag).toLowerCase().trim();
      if (!key) continue;
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }
  }

  const totalCategoryHits = Array.from(categoryCounts.values()).reduce((sum, n) => sum + n, 0);
  const categories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalCategoryHits ? Math.round((value / totalCategoryHits) * 100) : 0,
      color: CATEGORY_COLORS[label] ?? '#94a3b8'
    }));

  return ok({
    totalReports: reports.length,
    positiveReports: positive,
    negativeReports: negative,
    flaggedReports: flagged,
    categories
  });
}
