import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null, claimedAccounts: [], recentEvents: [] });

    const [claimedAccounts, myReports] = await Promise.all([
      Promise.all((user.claimedAccounts ?? []).slice(0, 10).map((id) => accountsRepo.findById(id))).catch(() => []),
      reportsRepo.listByReporter(user._id, 10).catch(() => [])
    ]);

    // Map reports into the shape the profile UI expects (eventType, description, timestamp, status).
    const recentEvents = myReports.map((report) => ({
      _id: report._id,
      eventType: report.type,
      description: report.description,
      subjectId: report.accountId,
      timestamp: report.createdAt ?? new Date().toISOString(),
      status: report.status,
      aiVerdict: report.aiVerdict,
      adminDecision: report.adminDecision
    }));

    return ok({
      user,
      claimedAccounts: claimedAccounts.filter(Boolean),
      recentEvents
    });
  } catch (err) {
    console.error('[GET /api/me]', err);
    return ok({ user: null, claimedAccounts: [], recentEvents: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Only allow safe profile fields to be updated
    const allowed = [
      'name', 'phone', 'dob', 'city', 'country', 'username',
      'occupationRole', 'networkSize', 'education', 'specializedField',
      'managesMoneyPeopleSystem', 'physicalIntellectualLimitations',
      'igUrl', 'tiktokUrl', 'xUrl', 'linkedinUrl', 'redditUrl',
      'ytUrl', 'fbUrl', 'snapchatUrl', 'onboardingComplete'
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    const updated = await usersRepo.update(user._id, patch);
    return ok({ user: updated });
  } catch (err) {
    console.error('[PATCH /api/me]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
