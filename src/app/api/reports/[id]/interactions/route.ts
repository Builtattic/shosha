import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getCurrentUserReadOnly, requireUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as interactionsRepo from '@/lib/repos/reportInteractions';
import * as notificationsRepo from '@/lib/repos/notifications';
import * as reportsRepo from '@/lib/repos/reports';
import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';
import * as siteSettingsRepo from '@/lib/repos/siteSettings';

async function notifyReporter(
  reportId: string,
  actorId: string,
  kind: 'report_align' | 'report_oppose' | 'report_comment',
  bodyPrefix: string
) {
  const report = await reportsRepo.findById(reportId);
  if (!report || !report.reporterId || report.reporterId === actorId) return;
  const [account, actor] = await Promise.all([
    accountsRepo.findById(report.accountId),
    usersRepo.findById(actorId)
  ]);
  const subject = account?.displayName || account?.username || 'your filing';
  const actorLabel = actor?.name || actor?.username || 'Someone';
  const titles: Record<typeof kind, string> = {
    report_align: 'New aligned vote',
    report_oppose: 'New opposing vote',
    report_comment: 'New comment'
  };
  await notificationsRepo.create({
    userId: report.reporterId,
    kind,
    title: titles[kind],
    body: `${actorLabel} ${bodyPrefix} your filing on ${subject}.`,
    link: `/account/${report.accountId}`,
    meta: { reportId, actorId }
  });
}

const interactionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['align', 'oppose']) }),
  z.object({ action: z.literal('comment'), text: z.string().min(1).max(280) }),
  z.object({ action: z.literal('share') }),
  z.object({ action: z.literal('bookmark') })
]);

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);
  const user = await getCurrentUserReadOnly();
  const state = await interactionsRepo.getViewerState(id.data, user?._id);
  return ok(state);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = interactionSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid interaction payload.', 422);

  if (parsed.data.action === 'share') {
    const result = await interactionsRepo.addShare(id.data);
    if (!result) return fail('not_found', 'No filing exists for that id.', 404);
    return ok(result);
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return fail('unauthorized', 'Sign in to interact with this filing.', 401);
  }

  if (parsed.data.action === 'align' || parsed.data.action === 'oppose') {
    const result = await interactionsRepo.setVote(id.data, user._id, parsed.data.action);
    if (!result) return fail('not_found', 'No filing exists for that id.', 404);
    const settings = await siteSettingsRepo.get();
    if (parsed.data.action === 'oppose' && result.stats?.opposes >= settings.disputeThreshold) {
      const report = await reportsRepo.findById(id.data);
      if (report && report.disputeStatus !== 'open') {
        await reportsRepo.update(id.data, { disputeStatus: 'open' });
      }
    }
    // Only notify when the vote was newly set (not when toggled off).
    if (result.vote === parsed.data.action) {
      await notifyReporter(
        id.data,
        user._id,
        parsed.data.action === 'align' ? 'report_align' : 'report_oppose',
        parsed.data.action === 'align' ? 'aligned with' : 'opposed'
      );
    }
    return ok(result);
  }

  if (parsed.data.action === 'comment') {
    const result = await interactionsRepo.addComment(id.data, user._id, parsed.data.text);
    if (!result) return fail('not_found', 'No filing exists for that id.', 404);
    await notifyReporter(id.data, user._id, 'report_comment', 'commented on');
    return ok(result);
  }

  return ok(await interactionsRepo.toggleBookmark(id.data, user._id));
}
