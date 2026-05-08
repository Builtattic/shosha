import { ok } from '@/lib/api';
import { cached } from '@/lib/cache';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export async function GET() {
  const data = await cached('shosha:v1:stats', 45, async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [accountsTracked, eventsToday, eventsTotal, eventsLast7, top] = await Promise.all([
      accountsRepo.count().catch(() => 0),
      reportsRepo.countSince(startOfDay).catch(() => 0),
      reportsRepo.count().catch(() => 0),
      reportsRepo.countSince(sevenDaysAgoDate).catch(() => 0),
      accountsRepo.listTop(100).catch(() => [])
    ]);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let totalDelta = 0;
    let counted = 0;
    for (const account of top) {
      const history = account.scoreHistory ?? [];
      if (!history.length) continue;
      const before = [...history]
        .reverse()
        .find((entry) => new Date(entry.t).valueOf() <= sevenDaysAgo);
      const baseline = before ? before.s : history[0].s;
      totalDelta += account.score - baseline;
      counted += 1;
    }
    const avgWeeklyDelta = counted ? Math.round(totalDelta / counted) : 0;

    // Net momentum: percentage of recent activity skewed positive vs total events.
    const netMomentum = eventsTotal ? Math.round((eventsLast7 / eventsTotal) * 100) : 0;

    return {
      accountsTracked,
      eventsToday,
      eventsTotal,
      eventsLast7,
      avgWeeklyDelta,
      netMomentum
    };
  });

  return ok(data);
}
