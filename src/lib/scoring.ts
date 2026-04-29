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

// ─────────────────────────────────────────────────────────────────────────────
// Profile dimension scoring (8 static profile-context multipliers).
// IY / P / M / E / AB / RY / AW / RP — drawn from onboarding fields.
// ─────────────────────────────────────────────────────────────────────────────

export type DimensionScore = {
  key: string;
  fullName: string;
  value: number;
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

// Per-event multipliers (not derived from onboarding — chosen at filing time).
export const CIRCUMSTANCES_LABELS: Record<string, string> = { '0.5': 'Extreme Pressure', '1': 'Normal', '1.5': 'Manageable', '2': 'Favorable', '2.5': 'Highly Favorable', '3': 'Optimal' };
export const INTENT_LABELS: Record<string, string> = { '0.5': 'Unintended', '1': 'Unaware', '1.5': 'Careless', '2': 'Intentional', '2.5': 'Calculated', '3': 'Strategic' };

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

export function calcShoshaScore(dims: DimensionScore[]): number {
  if (!dims.length) return 0;
  const avg = dims.reduce((sum, d) => sum + scoreToPercent(d.value), 0) / dims.length;
  return Math.round(avg);
}

// ─────────────────────────────────────────────────────────────────────────────
// New event-driven score ledger.
//   Score₀ = 1000
//   Δ      = BaseImpact × (IY×P×M×E×AW×AB×C×RY×IN×RP) / 10
//   Score  = 1000 + Σ Δ
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_SCORE = 1000;

export type EventCategory =
  | 'small_help'
  | 'community'
  | 'integrity'
  | 'major_contribution'
  | 'saving_life'
  | 'insult'
  | 'harassment'
  | 'hate_speech'
  | 'fraud'
  | 'assault'
  | 'severe_violence';

export const BASE_IMPACTS: Record<EventCategory, { label: string; value: number; type: 'positive' | 'negative' }> = {
  small_help: { label: 'Small help', value: 50, type: 'positive' },
  community: { label: 'Community contribution', value: 150, type: 'positive' },
  integrity: { label: 'Integrity / honesty', value: 300, type: 'positive' },
  major_contribution: { label: 'Major contribution', value: 500, type: 'positive' },
  saving_life: { label: 'Saving a life', value: 1000, type: 'positive' },
  insult: { label: 'Insult', value: -50, type: 'negative' },
  harassment: { label: 'Harassment', value: -150, type: 'negative' },
  hate_speech: { label: 'Hate speech', value: -300, type: 'negative' },
  fraud: { label: 'Fraud', value: -500, type: 'negative' },
  assault: { label: 'Assault', value: -700, type: 'negative' },
  severe_violence: { label: 'Severe violence', value: -1000, type: 'negative' },
};

export type EventMultipliers = {
  identity: number;       // IY 0.5 – 1.5
  power: number;          // P  0.5 – 3
  means: number;          // M  0.5 – 3
  environment: number;    // E  0.5 – 3
  awareness: number;      // AW 0.5 – 3
  ability: number;        // AB 0.5 – 1
  circumstances: number;  // C  0.5 – 3 (per event)
  responsibility: number; // RY 0.5 – 3
  intent: number;         // IN 0.5 – 3 (per event)
  reputation: number;     // RP 0.5 – 3
};

export const DEFAULT_MULTIPLIERS: EventMultipliers = {
  identity: 1, power: 1, means: 1, environment: 1, awareness: 1,
  ability: 1, circumstances: 1, responsibility: 1, intent: 1, reputation: 1,
};

// Map the 8 onboarding-derived dimension scores into the event multiplier shape.
// Per-event values (Circumstances, Intent) are passed in or default to 1.
export function profileMultipliersFromUser(user: AppUser, perEvent?: { circumstances?: number; intent?: number }): EventMultipliers {
  const dims = calcProfileScores(user);
  const byKey: Record<string, number> = {};
  for (const d of dims) byKey[d.key] = d.value;
  return {
    identity: byKey.IY ?? 1,
    power: byKey.P ?? 1,
    means: byKey.M ?? 1,
    environment: byKey.E ?? 1,
    awareness: byKey.AW ?? 1,
    ability: byKey.AB ?? 1,
    responsibility: byKey.RY ?? 1,
    reputation: byKey.RP ?? 1,
    circumstances: perEvent?.circumstances ?? 1,
    intent: perEvent?.intent ?? 1,
  };
}

// Δ = BaseImpact × (IY × P × M × E × AW × AB × C × RY × IN × RP) / 10
export function calcDelta(baseImpact: number, m: EventMultipliers): number {
  const product =
    m.identity * m.power * m.means * m.environment * m.awareness *
    m.ability * m.circumstances * m.responsibility * m.intent * m.reputation;
  return Math.round((baseImpact * product) / 10);
}

export type LedgerEntry = {
  t: string;            // ISO timestamp
  delta: number;        // signed Δ applied
  cause: ScoreCause;
  category?: EventCategory;
  eventId?: string;
  multipliers?: EventMultipliers;
};

export function applyDeltaToLedger(currentScore: number | undefined, delta: number, entry: Omit<LedgerEntry, 'delta'>, history: LedgerEntry[] = []): { score: number; history: LedgerEntry[] } {
  const base = typeof currentScore === 'number' ? currentScore : BASE_SCORE;
  const next = base + delta;
  return {
    score: Math.round(next),
    history: [...history, { ...entry, delta }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly momentum layer.
//   P = Σ positive Δ (week); N = Σ |negative Δ| (week)
//   R = (P − N) / (P + N + 1)
//   DecayFactor = 1 + 0.2 × R
//   W_new = W_old × DecayFactor + (P − N)
// ─────────────────────────────────────────────────────────────────────────────

export const MOMENTUM_GAMMA = 0.2;

export function weeklyTotals(entries: LedgerEntry[], windowStart: Date, windowEnd: Date): { P: number; N: number } {
  let P = 0, N = 0;
  for (const e of entries) {
    const t = new Date(e.t).getTime();
    if (t < windowStart.getTime() || t > windowEnd.getTime()) continue;
    if (e.delta > 0) P += e.delta;
    else N += Math.abs(e.delta);
  }
  return { P, N };
}

export function applyWeeklyMomentum(currentScore: number, P: number, N: number): { newScore: number; ratio: number; decayFactor: number } {
  const ratio = (P - N) / (P + N + 1);
  const decayFactor = 1 + MOMENTUM_GAMMA * ratio;
  const newScore = currentScore * decayFactor + (P - N);
  return { newScore: Math.round(newScore), ratio, decayFactor };
}
