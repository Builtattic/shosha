import { z } from 'zod';
import { fail, fromZod, ok } from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import {
  DEFAULT_MULTIPLIERS,
  applySheetScore,
  calcDelta,
  calcMultiplierQuotient,
  profileMultipliersFromUser,
  resolveSheetBaseImpact,
} from '@/lib/scoring';
import * as accountsRepo from '@/lib/repos/accounts';
import * as adminActionsRepo from '@/lib/repos/adminActions';
import * as eventsRepo from '@/lib/repos/events';
import * as evidenceRepo from '@/lib/repos/evidenceProposals';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';

const schema = z.object({
  verdict: z.enum(['approved', 'rejected']),
  note: z.string().max(500).default('Shosha evidence review.'),
  finalImpact: z.number().int().min(-10).max(10).optional()
});

function evidenceMediaUrl(proposalId: string, sourceUrls: string[]) {
  const first = sourceUrls.find((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
  return first ?? `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(proposalId)}`;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return fail('forbidden', 'Only tribunal staff can decide Shosha evidence.', 403);

  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No evidence proposal exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fromZod(parsed.error);

  const proposal = await evidenceRepo.findById(id.data);
  if (!proposal) return fail('not_found', 'No evidence proposal exists for that id.', 404);
  if (proposal.status !== 'pending') return fail('already_decided', 'This evidence proposal has already been reviewed.', 409);

  const account = await accountsRepo.findById(proposal.accountId);
  if (!account) return fail('not_found', 'No profile exists for this evidence proposal.', 404);

  if (parsed.data.verdict === 'rejected') {
    const rejected = await evidenceRepo.update(proposal._id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: user!._id
    });
    await adminActionsRepo.create({
      actor: user!,
      action: 'evidence.reject',
      entityType: 'evidence',
      entityId: proposal._id,
      before: proposal,
      after: rejected
    });
    return ok(rejected);
  }

  const scoringRow = resolveSheetBaseImpact(proposal.scoringDeed, proposal.type);
  const claimant = account.claimedBy ? await usersRepo.findById(account.claimedBy) : null;
  const multipliers = claimant?.onboardingComplete ? profileMultipliersFromUser(claimant) : DEFAULT_MULTIPLIERS;
  const multiplierQuotient = calcMultiplierQuotient(multipliers);
  const delta = calcDelta(scoringRow.baseScore, multipliers);
  const scoreBefore = account.score ?? 1000;
  const { score: scoreAfter, decay } = applySheetScore(scoreBefore, delta);
  const decidedAt = new Date().toISOString();
  const finalImpact = parsed.data.finalImpact ?? proposal.suggestedImpact;

  const report = await reportsRepo.create({
    accountId: account._id,
    reporterId: user!._id,
    anonymousTag: user!.username,
    type: proposal.type,
    description: proposal.summary,
    feelings: `Shosha evidence: ${proposal.title}`,
    media: {
      url: evidenceMediaUrl(proposal._id, proposal.sourceUrls),
      type: 'image',
      width: 0,
      height: 0,
      bytes: 0
    },
    status: 'approved',
    aiVerdict: {
      valid: true,
      confidence: proposal.confidence,
      proposedImpact: finalImpact,
      reasoning: `Approved Shosha evidence mapped to ${scoringRow.deed}.`,
      categoryTags: [scoringRow.category],
      abuseFlags: [], isAiFabricated: false,
      analyzedAt: decidedAt
    },
    adminDecision: {
      adminId: user!._id,
      verdict: 'approved',
      finalImpact,
      note: parsed.data.note,
      decidedAt
    },
    visibility: 'public',
    pinned: false,
    featured: false,
    createdByAdminId: user!._id,
    source: 'admin',
    stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 }
  });

  const event = await eventsRepo.create({
    subjectId: account._id,
    reporterId: user!._id,
    anonymousTag: user!.username,
    eventType: proposal.type,
    description: proposal.summary,
    baseImpactKey: scoringRow.deed,
    baseImpact: scoringRow.baseScore,
    multipliers,
    multiplierQuotient,
    delta,
    scoreBefore,
    scoreAfter,
    decay,
    category: scoringRow.category,
    deed: scoringRow.deed,
    formulaVersion: 'sheet-v1',
    proofLinks: proposal.sourceUrls,
    location: account.region ?? 'Global',
    timestamp: proposal.eventDate ?? decidedAt,
    status: 'approved',
    aiVerdict: { valid: true, reasoning: `Shosha evidence confidence ${Math.round(proposal.confidence * 100)}%.` },
    adminDecision: { verdict: 'approved', note: parsed.data.note, decidedAt },
    stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 }
  });

  const updatedReport = await reportsRepo.update(report._id, { eventId: event._id });
  const updatedAccount = await accountsRepo.update(account._id, {
    score: scoreAfter,
    credibility: account.credibility ?? 80,
    scoreHistory: [
      ...(account.scoreHistory ?? []),
      {
        t: decidedAt,
        s: scoreAfter,
        cause: 'report',
        delta,
        baseScore: scoringRow.baseScore,
        profileId: account.profileId ?? account._id,
        eventId: event._id,
        multiplierQuotient,
        decay,
        category: scoringRow.category,
        deed: scoringRow.deed,
        multipliers,
      },
    ],
  });
  const approved = await evidenceRepo.update(proposal._id, {
    status: 'approved',
    reviewedAt: decidedAt,
    reviewedBy: user!._id,
    reportId: report._id,
    eventId: event._id
  });

  await adminActionsRepo.create({
    actor: user!,
    action: 'evidence.approve',
    entityType: 'evidence',
    entityId: proposal._id,
    before: { proposal, account },
    after: { proposal: approved, account: updatedAccount, report: updatedReport, event }
  });

  return ok({ proposal: approved, account: updatedAccount, report: updatedReport, event });
}
