import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getCurrentUserReadOnly } from '@/lib/auth';
import { sendIssueReportEmail } from '@/lib/email';
import * as issueReportsRepo from '@/lib/repos/issueReports';

export const runtime = 'nodejs';

const issueSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  issueType: z.enum([
    'Bug',
    'UI Issue',
    'Performance Problem',
    'Incorrect Score/Calculation',
    'Broken Feature',
    'Report Abuse',
    'Security Concern',
    'Other',
  ]),
  page: z.enum([
    'Profile',
    'Feed',
    'People',
    'Ranks',
    'Impact',
    'Create Report',
    'Notifications',
    'Admin',
    'Other',
  ]),
  title: z.string().min(3).max(150),
  details: z.string().min(10).max(5000),
  attachmentUrls: z.array(z.string().url()).max(5).optional(),
  device: z.string().max(50).optional(),
  browser: z.string().max(50).optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUserReadOnly();
  const json = await request.json().catch(() => null);
  const parsed = issueSchema.safeParse(json);

  if (!parsed.success) {
    return fail('validation_error', 'Please fill in all required fields.', 422);
  }

  const report = await issueReportsRepo.create({
    ...parsed.data,
    status: 'open',
    submittedBy: user?._id,
  });

  try {
    await sendIssueReportEmail({
      ...parsed.data,
      createdAt: report.createdAt,
      reportId: report._id,
    });
  } catch (err) {
    // Email failure must never block submission success.
    console.error('[issue-report] email send error:', err);
  }

  return ok({ success: true, reportId: report._id });
}
