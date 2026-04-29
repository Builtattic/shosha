import type { Breakdown, ScoreCause } from '@/types';
import type { AppUser } from '@/lib/repos/users';
import { clamp } from '@/lib/utils';

const traitKeys = ['authenticity', 'engagement', 'community', 'content', 'impact'] as const;
type Trait = (typeof traitKeys)[number];

export type ScoredAccount = {
  score: number;
  breakdown: Breakdown;
  scoreHistory: Array<{ t: Date; s: number; cause: ScoreCause }>;
};

export function applyImpact(
  account: ScoredAccount,
  impact: number,
  cause: ScoreCause,
  categoryTags: string[] = []
) {
  const next = clamp(account.score + impact, 0, 100);
  const weights = traitKeys.map((trait) => (categoryTags.includes(trait) ? 2 : 1));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);

  traitKeys.forEach((trait, index) => {
    const share = (impact * weights[index]) / weightTotal;
    account.breakdown[trait] = Math.round(clamp(account.breakdown[trait] + share, 0, 100));
  });

  account.score = Math.round(next);
  account.scoreHistory.push({ t: new Date(), s: account.score, cause });
  return account;
}

export function averageBreakdown(): Breakdown {
  return {
    authenticity: 60,
    engagement: 60,
    community: 60,
    content: 60,
    impact: 60
  };
}

// TODO: Add monthly decay toward baseline 60 when a scheduler is wired.

// ── Profile Dimension Scoring ─────────────────────────────────────────────────
// Maps onboarding fields → IY / P / M / E / AB / RY / AW / RP dimensions.

export type DimensionScore = {
  key: string;
  fullName: string;
  value: number;       // 0.5 – 3
  levelLabel: string;
  description: string;
};

const IDENTITY_LABELS: Record<string, string> = { '0.5': 'Constrained', '1': 'Neutral', '1.5': 'Advantaged' };
const POWER_LABELS: Record<string, string> = { '0.5': 'None', '1': 'Individual', '1.5': 'Local Influence', '2': 'Leadership', '2.5': 'National Power', '3': 'Global Authority' };
const MEANS_LABELS: Record<string, string> = { '0.5': 'Minimal', '1': 'Limited', '1.5': 'Moderate', '2': 'High', '2.5': 'Institutional', '3': 'Systematic Control' };
const ENVIRONMENT_LABELS: Record<string, string> = { '0.5': 'Extreme Constraint', '1': 'Normal', '1.5': 'Stable', '2': 'Privileged', '2.5': 'Highly Privileged', '3': 'Elite' };
const ABILITY_LABELS: Record<string, string> = { '0.5': 'Handicapped', '1': 'Abled' };
const RESPONSIBILITY_LABELS: Record<string, string> = { '0.5': 'Executor', '1': 'Contributor', '1.5': 'Accountable', '2': 'Decision Maker', '2.5': 'Leader', '3': 'Primary Authority' };
const AWARENESS_LABELS: Record<string, string> = { '0.5': 'Unaware', '1': 'Aware', '1.5': 'Informed', '2': 'Educated', '2.5': 'Highly Skilled', '3': 'Expert' };
const REPUTATION_LABELS: Record<string, string> = { '0.5': 'Strong Positive', '1': 'Neutral', '1.5': 'Questionable', '2': 'Mixed', '2.5': 'Repeater', '3': 'Chronic' };

function snapToLabels(val: number, labels: Record<string, string>): { value: number; levelLabel: string } {
  const steps = Object.keys(labels).map(Number).sort((a, b) => a - b);
  let closest = steps[0];
  for (const s of steps) {
    if (Math.abs(val - s) < Math.abs(val - closest)) closest = s;
  }
  return { value: closest, levelLabel: labels[String(closest)] ?? '–' };
}

function dim(
  key: string, fullName: string, description: string,
  rawVal: number, labels: Record<string, string>
): DimensionScore {
  const { value, levelLabel } = snapToLabels(rawVal, labels);
  return { key, fullName, value, levelLabel, description };
}

export function calcProfileScores(user: AppUser): DimensionScore[] {
  if (!user.occupationRole && !user.education && !user.managesMoneyPeopleSystem) return [];

  const roleP: Record<string, number> = { student: 0.5, unemployed: 0.5, individual_contributor: 1, manager: 2, founder_business_owner: 2, public_figure_influencer: 2.5, government_political: 3 };
  const netP: Record<string, number> = { none: 0.5, '<1k': 1, '1k-10k': 1.5, '10k-100k': 2, '100k-1m': 2.5, '1m-100m': 3, '100m+': 3 };
  const eduP: Record<string, number> = { no_formal: 0.5, school: 1, undergraduate: 1.5, postgraduate: 2, doctorate_specialized: 2.5 };
  const mgmtP: Record<string, number> = { none: 1, small_team_limited_control: 1.5, moderate_responsibility: 2, large_team_major_decisions: 2.5, organizational_institutional: 3 };
  const specP: Record<string, number> = { no: 0, some_experience: 0.25, professional: 0.5, expert: 0.75 };
  const abilityP: Record<string, number> = { yes: 0.5, prefer_not_to_say: 1, no: 1 };
  const roleMeansP: Record<string, number> = { student: 0.5, unemployed: 0.5, individual_contributor: 1, manager: 1.5, founder_business_owner: 2, public_figure_influencer: 2, government_political: 2.5 };
  const roleEnvP: Record<string, number> = { student: 1, unemployed: 0.5, individual_contributor: 1.5, manager: 2, founder_business_owner: 2, public_figure_influencer: 2.5, government_political: 3 };
  const roleRespP: Record<string, number> = { student: 0.5, unemployed: 0.5, individual_contributor: 1, manager: 2, founder_business_owner: 2, public_figure_influencer: 2, government_political: 2.5 };

  const role = user.occupationRole ?? '';
  const net = user.networkSize ?? '';
  const edu = user.education ?? '';
  const mgmt = user.managesMoneyPeopleSystem ?? '';
  const spec = user.specializedField ?? '';
  const ability = user.physicalIntellectualLimitations ?? '';

  const rP = roleP[role] ?? 1; const nP = netP[net] ?? 0.5;
  const eP = eduP[edu] ?? 1; const mP = mgmtP[mgmt] ?? 1;
  const sP = specP[spec] ?? 0; const aP = abilityP[ability] ?? 1;
  const rmP = roleMeansP[role] ?? 1; const reP = roleEnvP[role] ?? 1;
  const rrP = roleRespP[role] ?? 1;

  const repScore = user.reporterScore ?? 50;
  const repRaw = Math.max(0.5, Math.min(3, 3 - (repScore / 100) * 2.5));

  return [
    dim('IY', 'Identity', 'Social position and structural advantage', Math.min(1.5, 0.5 + ((roleP[role] ?? 1) - 0.5 + (nP - 0.5)) / 3), IDENTITY_LABELS),
    dim('P', 'Power', 'Reach, influence, and authority', rP * 0.6 + nP * 0.4, POWER_LABELS),
    dim('M', 'Means', 'Resources and control capacity', (rmP + mP) / 2, MEANS_LABELS),
    dim('E', 'Environment', 'Contextual privilege and stability', (reP + eP) / 2, ENVIRONMENT_LABELS),
    dim('AB', 'Ability', 'Physical and intellectual capacity', aP, ABILITY_LABELS),
    dim('RY', 'Responsibility', 'Accountability and decision-making scope', (rrP + mP) / 2, RESPONSIBILITY_LABELS),
    dim('AW', 'Awareness', 'Knowledge, expertise, and education', Math.min(3, eP + sP), AWARENESS_LABELS),
    dim('RP', 'Reputation', 'Historical credibility and trust', repRaw, REPUTATION_LABELS),
  ];
}

export function scoreToPercent(value: number): number {
  return Math.round(((value - 0.5) / 2.5) * 100);
}

// Composite 0–100 score across all 8 dimensions
export function calcShoshaScore(dims: DimensionScore[]): number {
  if (!dims.length) return 0;
  const avg = dims.reduce((sum, d) => sum + scoreToPercent(d.value), 0) / dims.length;
  return Math.round(avg);
}
