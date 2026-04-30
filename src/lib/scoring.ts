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
// Sheet-first event score ledger.
// CSV/screenshot source of truth:
//   Score0 = 1000
//   multiplierQuotient = RP * IN * IY * P * M * E * AB * C * RY * AW
//   delta = BaseScore * multiplierQuotient / 10
//   decay = ABS(delta) / (ABS(delta) + 1)
//   nextScore = ROUND(previousScore + delta * decay, 1)
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_SCORE = 1000;

export type SheetImpactType = 'positive' | 'negative';
export type EventCategory = string;

export type SheetScoringIndexRow = {
  category: string;
  deed: string;
  type: SheetImpactType;
  baseScore: number;
};

export const SHEET_SCORING_INDEX: SheetScoringIndexRow[] = [
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Cleaning shared spaces', type: 'positive', baseScore: 20 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Returning lost items', type: 'positive', baseScore: 20 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Holding doors / basic courtesy', type: 'positive', baseScore: 10 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Helping someone with small tasks', type: 'positive', baseScore: 30 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Giving directions / assistance', type: 'positive', baseScore: 20 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Littering', type: 'negative', baseScore: -10 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Being rude / insulting', type: 'negative', baseScore: -20 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Cutting queues', type: 'negative', baseScore: -30 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Ignoring basic courtesy', type: 'negative', baseScore: -10 },
  { category: 'MICRO / EVERYDAY ACTIONS', deed: 'Minor harassment (offline/online)', type: 'negative', baseScore: -30 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Supporting a friend emotionally', type: 'positive', baseScore: 50 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Resolving conflict peacefully', type: 'positive', baseScore: 70 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Standing up for someone', type: 'positive', baseScore: 100 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Mentoring / guiding', type: 'positive', baseScore: 70 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Public kindness to strangers', type: 'positive', baseScore: 50 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Bullying (offline/online)', type: 'negative', baseScore: -70 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Public humiliation', type: 'negative', baseScore: -100 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Gaslighting / manipulation', type: 'negative', baseScore: -50 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Harassment / stalking', type: 'negative', baseScore: -100 },
  { category: 'SOCIAL / INTERPERSONAL', deed: 'Spreading rumors', type: 'negative', baseScore: -70 },
  { category: 'ONLINE BEHAVIOR', deed: 'Sharing helpful information', type: 'positive', baseScore: 50 },
  { category: 'ONLINE BEHAVIOR', deed: 'Educating / awareness content', type: 'positive', baseScore: 50 },
  { category: 'ONLINE BEHAVIOR', deed: 'Amplifying good causes', type: 'positive', baseScore: 80 },
  { category: 'ONLINE BEHAVIOR', deed: 'Calling out injustice responsibly', type: 'positive', baseScore: 120 },
  { category: 'ONLINE BEHAVIOR', deed: 'Hate comments', type: 'negative', baseScore: -50 },
  { category: 'ONLINE BEHAVIOR', deed: 'Trolling', type: 'negative', baseScore: -80 },
  { category: 'ONLINE BEHAVIOR', deed: 'Doxxing', type: 'negative', baseScore: -120 },
  { category: 'ONLINE BEHAVIOR', deed: 'Spreading misinformation', type: 'negative', baseScore: -50 },
  { category: 'ONLINE BEHAVIOR', deed: 'Cancel mob participation', type: 'negative', baseScore: -80 },
  { category: 'ONLINE BEHAVIOR', deed: 'Impersonation', type: 'negative', baseScore: -120 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Lending money', type: 'positive', baseScore: 100 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Donating', type: 'positive', baseScore: 200 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Paying fairly', type: 'positive', baseScore: 100 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Supporting small businesses', type: 'positive', baseScore: 200 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Funding education / causes', type: 'positive', baseScore: 300 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Scamming / fraud', type: 'negative', baseScore: -200 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Not repaying loans', type: 'negative', baseScore: -100 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Exploiting workers', type: 'negative', baseScore: -300 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Bribery', type: 'negative', baseScore: -300 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Tax evasion', type: 'negative', baseScore: -200 },
  { category: 'FINANCIAL / TRANSACTIONAL', deed: 'Financial manipulation', type: 'negative', baseScore: -100 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Creating jobs', type: 'positive', baseScore: 600 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Ethical leadership', type: 'positive', baseScore: 400 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Fair hiring', type: 'positive', baseScore: 200 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Whistleblowing', type: 'positive', baseScore: 600 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Building useful products', type: 'positive', baseScore: 400 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Abuse of power', type: 'negative', baseScore: -400 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Workplace harassment', type: 'negative', baseScore: -600 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Discrimination', type: 'negative', baseScore: -400 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Corruption', type: 'negative', baseScore: -400 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Exploitation', type: 'negative', baseScore: -200 },
  { category: 'PROFESSIONAL / POWER USE', deed: 'Unethical decisions affecting others', type: 'negative', baseScore: -200 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Volunteering', type: 'positive', baseScore: 150 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Organizing community help', type: 'positive', baseScore: 300 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Environmental action (cleanup, planting)', type: 'positive', baseScore: 500 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Disaster relief participation', type: 'positive', baseScore: 300 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Public nuisance', type: 'negative', baseScore: -150 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Vandalism', type: 'negative', baseScore: -300 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Environmental damage', type: 'negative', baseScore: -300 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Inciting unrest', type: 'negative', baseScore: -500 },
  { category: 'COMMUNITY / PUBLIC IMPACT', deed: 'Destroying public property', type: 'negative', baseScore: -300 },
  { category: 'HEALTH / SAFETY', deed: 'Helping injured people', type: 'positive', baseScore: 300 },
  { category: 'HEALTH / SAFETY', deed: 'Donating blood/organs', type: 'positive', baseScore: 600 },
  { category: 'HEALTH / SAFETY', deed: 'Saving someone in danger', type: 'positive', baseScore: 900 },
  { category: 'HEALTH / SAFETY', deed: 'Promoting safety', type: 'positive', baseScore: 300 },
  { category: 'HEALTH / SAFETY', deed: 'Drunk driving', type: 'negative', baseScore: -600 },
  { category: 'HEALTH / SAFETY', deed: 'Negligence causing harm', type: 'negative', baseScore: -300 },
  { category: 'HEALTH / SAFETY', deed: 'Endangering others', type: 'negative', baseScore: -900 },
  { category: 'HEALTH / SAFETY', deed: 'Ignoring safety protocols', type: 'negative', baseScore: -300 },
  { category: 'LEGAL / CRIMINAL', deed: 'Reporting crime responsibly', type: 'positive', baseScore: 200 },
  { category: 'LEGAL / CRIMINAL', deed: 'Cooperating with law enforcement', type: 'positive', baseScore: 300 },
  { category: 'LEGAL / CRIMINAL', deed: 'Legal advocacy', type: 'positive', baseScore: 200 },
  { category: 'LEGAL / CRIMINAL', deed: 'Theft', type: 'negative', baseScore: -300 },
  { category: 'LEGAL / CRIMINAL', deed: 'Assault', type: 'negative', baseScore: -500 },
  { category: 'LEGAL / CRIMINAL', deed: 'Kidnapping', type: 'negative', baseScore: -700 },
  { category: 'LEGAL / CRIMINAL', deed: 'Sexual assault', type: 'negative', baseScore: -900 },
  { category: 'LEGAL / CRIMINAL', deed: 'Murder', type: 'negative', baseScore: -1000 },
  { category: 'LEGAL / CRIMINAL', deed: 'Organized crime', type: 'negative', baseScore: -1000 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Policy improving lives', type: 'positive', baseScore: 500 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Large-scale philanthropy', type: 'positive', baseScore: 800 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Infrastructure development', type: 'positive', baseScore: 500 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Conflict resolution', type: 'positive', baseScore: 800 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'War crimes', type: 'negative', baseScore: -1000 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Genocide', type: 'negative', baseScore: -1000 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Mass corruption', type: 'negative', baseScore: -1000 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Large-scale exploitation', type: 'negative', baseScore: -1000 },
  { category: 'LARGE SCALE / SYSTEMIC', deed: 'Economic harm affecting populations', type: 'negative', baseScore: -800 },
  { category: 'EXTREME IMPACT', deed: 'Saving a life', type: 'positive', baseScore: 1000 },
  { category: 'EXTREME IMPACT', deed: 'Saving multiple lives', type: 'positive', baseScore: 1500 },
  { category: 'EXTREME IMPACT', deed: 'Large rescue', type: 'positive', baseScore: 2500 },
  { category: 'EXTREME IMPACT', deed: 'Mass rescue / disaster intervention', type: 'positive', baseScore: 3500 },
  { category: 'EXTREME IMPACT', deed: 'City-scale life impact / relief', type: 'positive', baseScore: 5000 },
  { category: 'EXTREME IMPACT', deed: 'Nation-scale humanitarian action', type: 'positive', baseScore: 8000 },
  { category: 'EXTREME IMPACT', deed: 'Global / historic life-saving impact', type: 'positive', baseScore: 10000 },
  { category: 'EXTREME IMPACT', deed: 'Murder / rape', type: 'negative', baseScore: -1000 },
  { category: 'EXTREME IMPACT', deed: 'Multiple victims', type: 'negative', baseScore: -1500 },
  { category: 'EXTREME IMPACT', deed: 'Mass violence incident', type: 'negative', baseScore: -2500 },
  { category: 'EXTREME IMPACT', deed: 'Large-scale violent event / riot causing deaths', type: 'negative', baseScore: -3500 },
  { category: 'EXTREME IMPACT', deed: 'City-scale harm / coordinated violence', type: 'negative', baseScore: -5000 },
  { category: 'EXTREME IMPACT', deed: 'Nation-scale harm / war-level impact', type: 'negative', baseScore: -8000 },
  { category: 'EXTREME IMPACT', deed: 'Genocide / war crimes / systemic mass killing', type: 'negative', baseScore: -10000 },
];

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export const BASE_IMPACTS: Record<EventCategory, { label: string; value: number; type: SheetImpactType }> =
  Object.fromEntries(
    SHEET_SCORING_INDEX.map((row) => [
      normalizeLookup(row.deed),
      { label: row.deed, value: row.baseScore, type: row.type },
    ])
  );

export function findSheetScoringRow(keyOrDeed: string, type?: SheetImpactType): SheetScoringIndexRow | undefined {
  const normalized = normalizeLookup(keyOrDeed);
  return SHEET_SCORING_INDEX.find((row) => {
    const matches = normalizeLookup(row.deed) === normalized || normalizeLookup(row.category) === normalized;
    return matches && (!type || row.type === type);
  });
}

export function resolveSheetBaseImpact(keyOrDeed: string, type?: SheetImpactType): SheetScoringIndexRow {
  const exact = findSheetScoringRow(keyOrDeed, type);
  if (exact) return exact;
  return type === 'positive'
    ? { category: 'SOCIAL / INTERPERSONAL', deed: 'Public kindness to strangers', type: 'positive', baseScore: 50 }
    : { category: 'SOCIAL / INTERPERSONAL', deed: 'Public humiliation', type: 'negative', baseScore: -100 };
}

export function resolveSheetBaseImpactFromAdminImpact(finalImpact: number, fallbackType: SheetImpactType): SheetScoringIndexRow {
  const type: SheetImpactType = finalImpact > 0 ? 'positive' : finalImpact < 0 ? 'negative' : fallbackType;
  const target = Math.abs(finalImpact) * 100;
  const candidates = SHEET_SCORING_INDEX.filter((row) => row.type === type);
  if (!candidates.length) return resolveSheetBaseImpact('', type);
  if (target === 0) return resolveSheetBaseImpact('', type);
  return candidates.reduce((best, row) =>
    Math.abs(Math.abs(row.baseScore) - target) < Math.abs(Math.abs(best.baseScore) - target) ? row : best
  );
}

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

export function calcMultiplierQuotient(m: EventMultipliers): number {
  return roundTo(
    m.reputation * m.intent * m.identity * m.power * m.means *
    m.environment * m.ability * m.circumstances * m.responsibility * m.awareness,
    4
  );
}

// Δ = BaseScore × (RP × IN × IY × P × M × E × AB × C × RY × AW) / 10
export function calcDelta(baseImpact: number, m: EventMultipliers): number {
  return roundTo((baseImpact * calcMultiplierQuotient(m)) / 10, 1);
}

export type SheetDeltaLedgerRow = {
  baseScore: number;
  reputation: number;
  intent: number;
  profileId: string;
  identity: number;
  power: number;
  means: number;
  environment: number;
  ability: number;
  circumstances: number;
  responsibility: number;
  awareness: number;
  multiplierQuotient: number;
  delta: number;
  weekId?: string;
};

export function createSheetDeltaLedgerRow(input: {
  baseScore: number;
  profileId: string;
  multipliers: EventMultipliers;
  weekId?: string;
}): SheetDeltaLedgerRow {
  const { baseScore, profileId, multipliers, weekId } = input;
  return {
    baseScore,
    reputation: multipliers.reputation,
    intent: multipliers.intent,
    profileId,
    identity: multipliers.identity,
    power: multipliers.power,
    means: multipliers.means,
    environment: multipliers.environment,
    ability: multipliers.ability,
    circumstances: multipliers.circumstances,
    responsibility: multipliers.responsibility,
    awareness: multipliers.awareness,
    multiplierQuotient: calcMultiplierQuotient(multipliers),
    delta: calcDelta(baseScore, multipliers),
    weekId,
  };
}

export function sheetDecay(delta: number): number {
  const abs = Math.abs(delta);
  return abs / (abs + 1);
}

export function applySheetScore(previousScore: number, delta: number): { decay: number; score: number } {
  const decay = sheetDecay(delta);
  return {
    decay,
    score: roundTo(previousScore + delta * decay, 1),
  };
}

export function calcSheetScoreTracker(input: {
  baseScore?: number;
  w1Delta: number;
  w2P?: number;
  w2N?: number;
}) {
  const baseScore = input.baseScore ?? BASE_SCORE;
  const w1 = applySheetScore(baseScore, input.w1Delta);
  const w2Delta = (input.w2P ?? 0) + (input.w2N ?? 0);
  const w2 = applySheetScore(w1.score, w2Delta);
  return {
    baseScore,
    w1Delta: input.w1Delta,
    w1Decay: w1.decay,
    w1Score: w1.score,
    w2P: input.w2P ?? 0,
    w2N: input.w2N ?? 0,
    w2Delta,
    w2Decay: w2.decay,
    w2Score: w2.score,
  };
}

export function calcProfileCredibility(input: {
  baseCredibility?: number;
  trustBadgeBonus?: number;
  opposedPosts?: number;
  disputeLosses?: number;
  aiFlaggedPosts?: number;
}) {
  const baseCredibility = input.baseCredibility ?? 80;
  const trustBadgeBonus = input.trustBadgeBonus ?? 0;
  const totalCredibility = baseCredibility + trustBadgeBonus;
  const updatedCredibility = clamp(
    baseCredibility -
      (input.opposedPosts ?? 0) -
      (input.disputeLosses ?? 0) * 2.5 -
      (input.aiFlaggedPosts ?? 0) * 5,
    0,
    100
  );
  return {
    baseCredibility,
    trustBadgeBonus,
    totalCredibility,
    opposedPosts: input.opposedPosts ?? 0,
    disputeLosses: input.disputeLosses ?? 0,
    aiFlaggedPosts: input.aiFlaggedPosts ?? 0,
    updatedCredibility,
  };
}

export type LedgerEntry = {
  t: string;            // ISO timestamp
  delta: number;        // signed Δ applied
  cause: ScoreCause;
  category?: EventCategory;
  eventId?: string;
  multipliers?: EventMultipliers;
  baseScore?: number;
  profileId?: string;
  weekId?: string;
  multiplierQuotient?: number;
  decay?: number;
};

export function applyDeltaToLedger(currentScore: number | undefined, delta: number, entry: Omit<LedgerEntry, 'delta'>, history: LedgerEntry[] = []): { score: number; history: LedgerEntry[] } {
  const base = typeof currentScore === 'number' ? currentScore : BASE_SCORE;
  const { score } = applySheetScore(base, delta);
  return {
    score,
    history: [...history, { ...entry, delta, decay: sheetDecay(delta) }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet weekly layer. This intentionally follows PROFILE SCORE TRACKER:
//   Wn DELTA = P + N (where N is already negative in the tracker)
//   Wn DECAY = ABS(Wn DELTA) / (ABS(Wn DELTA) + 1)
//   Wn SCORE = ROUND(previousScore + Wn DELTA * Wn DECAY, 1)
// ─────────────────────────────────────────────────────────────────────────────

export const MOMENTUM_GAMMA = 0.2;

export function weeklyTotals(entries: LedgerEntry[], windowStart: Date, windowEnd: Date): { P: number; N: number } {
  let P = 0, N = 0;
  for (const e of entries) {
    const t = new Date(e.t).getTime();
    if (t < windowStart.getTime() || t > windowEnd.getTime()) continue;
    if (e.delta > 0) P += e.delta;
    else N += e.delta;
  }
  return { P, N };
}

export function applyWeeklyMomentum(currentScore: number, P: number, N: number): { newScore: number; ratio: number; decayFactor: number } {
  const delta = P + N;
  const { decay, score } = applySheetScore(currentScore, delta);
  return { newScore: score, ratio: decay, decayFactor: decay };
}
