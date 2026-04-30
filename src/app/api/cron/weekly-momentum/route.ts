import { fail, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as eventsRepo from '@/lib/repos/events';
import * as usersRepo from '@/lib/repos/users';

export const maxDuration = 300;

function authorize(request: Request, user: Awaited<ReturnType<typeof getCurrentUser>>): boolean {
  const expected = process.env.CRON_TOKEN;
  if (expected) {
    const header = request.headers.get('authorization') ?? request.headers.get('x-cron-token');
    if (header && (header === expected || header === `Bearer ${expected}`)) return true;
  }
  // Fallback: signed-in admins can trigger manually from the admin panel.
  return isAdmin(user);
}

function weekRange(reference = new Date()): { start: Date; end: Date } {
  // Rolling 7-day window ending at `reference`.
  const end = new Date(reference);
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!authorize(request, user)) {
    return fail('forbidden', 'Cron token missing or invalid.', 403);
  }

  const { start, end } = weekRange();
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const accounts = await accountsRepo.listAll(1000).catch(() => [] as Awaited<ReturnType<typeof accountsRepo.listAll>>);

  let processedAccounts = 0;
  let updatedUsers = 0;
  let totalEvents = 0;
  let totalPositive = 0;
  let totalNegative = 0;

  for (const account of accounts) {
    const events = await eventsRepo
      .listForAccount(account._id, 200)
      .catch(() => [] as Awaited<ReturnType<typeof eventsRepo.listForAccount>>);

    const recent = events.filter((e) => {
      const t = e.timestamp ?? e.createdAt ?? '';
      return t >= startIso && t <= endIso && e.status === 'approved';
    });

    if (recent.length === 0) continue;

    let P = 0;
    let N = 0;
    for (const e of recent) {
      if ((e.delta ?? 0) > 0) P += e.delta!;
      else if ((e.delta ?? 0) < 0) N += e.delta!;
    }
    const ratio = N === 0 ? Math.abs(P) : Math.abs(P) / Math.abs(N);
    const scoreAtSnapshot = account.score ?? 1000;
    // Light idle-decay nudge: 0.99 if no activity, 1.0 otherwise.
    const decayFactor = recent.length > 0 ? 1 : 0.99;

    processedAccounts += 1;
    totalEvents += recent.length;
    totalPositive += P;
    totalNegative += N;

    if (account.claimedBy) {
      await usersRepo
        .update(account.claimedBy, {
          weeklyStats: {
            weekStart: startIso,
            weekEnd: endIso,
            P,
            N,
            ratio,
            decayFactor,
            scoreAtSnapshot
          }
        })
        .catch(() => null);
      updatedUsers += 1;
    }
  }

  return ok({
    weekStart: startIso,
    weekEnd: endIso,
    processedAccounts,
    updatedUsers,
    totalEvents,
    totalPositive,
    totalNegative,
    scannedAccounts: accounts.length
  });
}

// Allow GET as a health-check echo so operators can verify the route is live without triggering work.
export async function GET() {
  return ok({
    route: 'weekly-momentum',
    accepts: 'POST',
    auth: process.env.CRON_TOKEN ? 'Bearer CRON_TOKEN or admin session' : 'admin session only (set CRON_TOKEN to enable headless cron)'
  });
}
