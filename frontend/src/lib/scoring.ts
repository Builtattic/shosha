/**
 * lib/scoring.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure scoring engine — no API calls, no React, no Next.js.
 * Safe to import in any component or utility.
 *
 * Ported from V1 scoring.ts.  The only V2 changes are:
 *   • Imports come from @/types/scoring  (Breakdown, ScoreCause, ScoringAppUser)
 *   • clamp comes from @/lib/utils
 *   • AppUser → ScoringAppUser (same field names already camelCase in V1 repo)
 */

import type { Breakdown, ScoreCause, ScoringAppUser } from '@/types/scoring';
import { clamp } from '@/lib/utils';

// ── Re-exports so consumers only need to import from @/lib/scoring ─────────────
export type { Breakdown, ScoreCause, ScoringAppUser };

// ── Trait breakdown ────────────────────────────────────────────────────────────

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
  categoryTags: string[] = [],
): ScoredAccount {
  const next = clamp(account.score + impact, 0, 100);
  const weights = traitKeys.map((trait) => (categoryTags.includes(trait) ? 2 : 1));
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);

  traitKeys.forEach((trait, i) => {
    const share = (impact * weights[i]) / weightTotal;
    account.breakdown[trait as Trait] = Math.round(
      clamp(account.breakdown[trait as Trait] + share, 0, 100),
    );
  });

  account.score = Math.round(next);
  account.scoreHistory.push({ t: new Date(), s: account.score, cause });
  return account;
}

export function averageBreakdown(): Breakdown {
  return { authenticity: 60, engagement: 60, community: 60, content: 60, impact: 60 };
}

// ── Profile dimension scoring ──────────────────────────────────────────────────
// 8 static multipliers derived from onboarding fields.
// IY / P / M / E / AB / RY / AW / RP

export type DimensionScore = {
  key: string;
  fullName: string;
  value: number;
  levelLabel: string;
  description: string;
};

const IDENTITY_LABELS:       Record<string, string> = { '0.5': 'Constrained', '1': 'Neutral', '1.5': 'Advantaged' };
const POWER_LABELS:          Record<string, string> = { '0.5': 'None', '1': 'Individual', '1.5': 'Local Influence', '2': 'Leadership', '2.5': 'National Power', '3': 'Global Authority' };
const MEANS_LABELS:          Record<string, string> = { '0.5': 'Minimal', '1': 'Limited', '1.5': 'Moderate', '2': 'High', '2.5': 'Institutional', '3': 'Systematic Control' };
const ENVIRONMENT_LABELS:    Record<string, string> = { '0.5': 'Extreme Constraint', '1': 'Normal', '1.5': 'Stable', '2': 'Privileged', '2.5': 'Highly Privileged', '3': 'Elite' };
const ABILITY_LABELS:        Record<string, string> = { '0.5': 'Handicapped', '1': 'Abled' };
const RESPONSIBILITY_LABELS: Record<string, string> = { '0.5': 'Executor', '1': 'Contributor', '1.5': 'Accountable', '2': 'Decision Maker', '2.5': 'Leader', '3': 'Primary Authority' };
const AWARENESS_LABELS:      Record<string, string> = { '0.5': 'Unaware', '1': 'Aware', '1.5': 'Informed', '2': 'Educated', '2.5': 'Highly Skilled', '3': 'Expert' };
const REPUTATION_LABELS:     Record<string, string> = { '0.5': 'Strong Positive', '1': 'Neutral', '1.5': 'Questionable', '2': 'Mixed', '2.5': 'Repeater', '3': 'Chronic' };

// Per-event multipliers (chosen at filing time, not derived from onboarding)
export const CIRCUMSTANCES_LABELS: Record<string, string> = {
  '0.5': 'Extreme Pressure', '1': 'Normal', '1.5': 'Manageable',
  '2': 'Favorable', '2.5': 'Highly Favorable', '3': 'Optimal',
};
export const INTENT_LABELS: Record<string, string> = {
  '0.5': "Didn't mean to", '1': 'Not Aware', '1.5': 'Not Careful',
  '2': 'Meant to', '2.5': 'Thought Through', '3': 'Fully Planned',
};
export const REPETITION_LABELS: Record<string, string> = {
  '0.5': 'No Clear Pattern', '1': 'Balanced', '1.5': 'Mixed Signals',
  '2': 'Leaning Off', '2.5': 'Pattern Forming', '3': 'Consistent Pattern',
};

function snapToLabels(
  val: number,
  labels: Record<string, string>,
): { value: number; levelLabel: string } {
  const steps = Object.keys(labels).map(Number).sort((a, b) => a - b);
  let closest = steps[0];
  for (const s of steps) {
    if (Math.abs(val - s) < Math.abs(val - closest)) closest = s;
  }
  return { value: closest, levelLabel: labels[String(closest)] ?? '–' };
}

function dim(
  key: string,
  fullName: string,
  description: string,
  rawVal: number,
  labels: Record<string, string>,
): DimensionScore {
  const { value, levelLabel } = snapToLabels(rawVal, labels);
  return { key, fullName, value, levelLabel, description };
}

export function calcProfileScores(user: ScoringAppUser): DimensionScore[] {
  if (!user.occupationRole && !user.education && !user.managesMoneyPeopleSystem) return [];

  const roleP:   Record<string, number> = { student: 0.5, unemployed: 0.5, individual_contributor: 1, manager: 2, founder_business_owner: 2, public_figure_influencer: 2.5, government_political: 3 };
  const netP:    Record<string, number> = { none: 0.5, '<1k': 1, '1k-10k': 1.5, '10k-100k': 2, '100k-1m': 2.5, '1m-100m': 3, '100m+': 3 };
  const eduP:    Record<string, number> = { no_formal: 0.5, school: 1, undergraduate: 1.5, postgraduate: 2, doctorate_specialized: 2.5 };
  const mgmtP:   Record<string, number> = { none: 1, small_team_limited_control: 1.5, moderate_responsibility: 2, large_team_major_decisions: 2.5, organizational_institutional: 3 };
  const specP:   Record<string, number> = { no: 0, some_experience: 0.25, professional: 0.5, expert: 0.75 };
  const abilityP: Record<string, number> = { yes: 0.5, prefer_not_to_say: 1, no: 1 };
  const roleMeansP: Record<string, number> = { student: 0.5, unemployed: 0.5, individual_contributor: 1, manager: 1.5, founder_business_owner: 2, public_figure_influencer: 2, government_political: 2.5 };
  const roleEnvP:   Record<string, number> = { student: 1, unemployed: 0.5, individual_contributor: 1.5, manager: 2, founder_business_owner: 2, public_figure_influencer: 2.5, government_political: 3 };
  const roleRespP:  Record<string, number> = { student: 0.5, unemployed: 0.5, individual_contributor: 1, manager: 2, founder_business_owner: 2, public_figure_influencer: 2, government_political: 2.5 };

  const role    = user.occupationRole              ?? '';
  const net     = user.networkSize                 ?? '';
  const edu     = user.education                   ?? '';
  const mgmt    = user.managesMoneyPeopleSystem    ?? '';
  const spec    = user.specializedField            ?? '';
  const ability = user.physicalIntellectualLimitations ?? '';

  const rP  = roleP[role]   ?? 1;  const nP  = netP[net]    ?? 0.5;
  const eP  = eduP[edu]     ?? 1;  const mP  = mgmtP[mgmt]  ?? 1;
  const sP  = specP[spec]   ?? 0;  const aP  = abilityP[ability] ?? 1;
  const rmP = roleMeansP[role] ?? 1;
  const reP = roleEnvP[role]   ?? 1;
  const rrP = roleRespP[role]  ?? 1;

  const repScore = user.reporterScore ?? 50;
  const repRaw   = Math.max(0.5, Math.min(3, 3 - (repScore / 100) * 2.5));

  return [
    dim('IY', 'Identity',       'Social position and structural advantage',       Math.min(1.5, 0.5 + ((roleP[role] ?? 1) - 0.5 + (nP - 0.5)) / 3), IDENTITY_LABELS),
    dim('P',  'Power',          'Reach, influence, and authority',                 rP * 0.6 + nP * 0.4,      POWER_LABELS),
    dim('M',  'Means',          'Resources and control capacity',                  (rmP + mP) / 2,            MEANS_LABELS),
    dim('E',  'Environment',    'Contextual privilege and stability',              (reP + eP) / 2,            ENVIRONMENT_LABELS),
    dim('AB', 'Ability',        'Physical and intellectual capacity',              aP,                        ABILITY_LABELS),
    dim('RY', 'Responsibility', 'Accountability and decision-making scope',       (rrP + mP) / 2,            RESPONSIBILITY_LABELS),
    dim('AW', 'Awareness',      'Knowledge, expertise, and education',            Math.min(3, eP + sP),      AWARENESS_LABELS),
    dim('RP', 'Reputation',     'Historical credibility and trust',               repRaw,                    REPUTATION_LABELS),
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

// ── Sheet-first event scoring ledger ──────────────────────────────────────────
//
// Formula (CSV / screenshot source of truth):
//   Score0                = 1000
//   multiplierQuotient    = RP × IN × IY × P × M × E × AB × C × RY × AW
//   delta                 = BaseScore × multiplierQuotient / 10
//   decay                 = ABS(delta) / (ABS(delta) + 1000)
//   nextScore             = ROUND(previousScore + delta × decay, 1)

export const BASE_SCORE = 1000;

export type SheetImpactType = 'positive' | 'negative';
export type EventCategory   = string;

export type SheetScoringIndexRow = {
  category:  string;
  deed:      string;
  type:      SheetImpactType;
  baseScore: number;
};

export const SHEET_SCORING_INDEX: SheetScoringIndexRow[] = [
  // Micro | Everyday Actions
  { category: 'Micro | Everyday Actions', deed: 'Cleaning shared spaces',             type: 'positive', baseScore: 20 },
  { category: 'Micro | Everyday Actions', deed: 'Returning lost items',               type: 'positive', baseScore: 20 },
  { category: 'Micro | Everyday Actions', deed: 'Holding doors / basic courtesy',     type: 'positive', baseScore: 10 },
  { category: 'Micro | Everyday Actions', deed: 'Helping someone with small tasks',   type: 'positive', baseScore: 30 },
  { category: 'Micro | Everyday Actions', deed: 'Giving directions / assistance',     type: 'positive', baseScore: 20 },
  { category: 'Micro | Everyday Actions', deed: 'Littering',                          type: 'negative', baseScore: -10 },
  { category: 'Micro | Everyday Actions', deed: 'Being rude / insulting',             type: 'negative', baseScore: -20 },
  { category: 'Micro | Everyday Actions', deed: 'Cutting queues',                     type: 'negative', baseScore: -30 },
  { category: 'Micro | Everyday Actions', deed: 'Ignoring basic courtesy',            type: 'negative', baseScore: -10 },
  { category: 'Micro | Everyday Actions', deed: 'Minor harassment (offline/online)',  type: 'negative', baseScore: -30 },
  // Social | Interpersonal
  { category: 'Social | Interpersonal', deed: 'Supporting a friend emotionally', type: 'positive', baseScore: 50 },
  { category: 'Social | Interpersonal', deed: 'Resolving conflict peacefully',   type: 'positive', baseScore: 70 },
  { category: 'Social | Interpersonal', deed: 'Standing up for someone',         type: 'positive', baseScore: 100 },
  { category: 'Social | Interpersonal', deed: 'Mentoring / guiding',             type: 'positive', baseScore: 70 },
  { category: 'Social | Interpersonal', deed: 'Public kindness to strangers',    type: 'positive', baseScore: 50 },
  { category: 'Social | Interpersonal', deed: 'Bullying (offline/online)',        type: 'negative', baseScore: -70 },
  { category: 'Social | Interpersonal', deed: 'Public humiliation',              type: 'negative', baseScore: -100 },
  { category: 'Social | Interpersonal', deed: 'Gaslighting / manipulation',      type: 'negative', baseScore: -50 },
  { category: 'Social | Interpersonal', deed: 'Harassment / stalking',           type: 'negative', baseScore: -100 },
  { category: 'Social | Interpersonal', deed: 'Spreading rumors',                type: 'negative', baseScore: -70 },
  // Online Behavior
  { category: 'Online Behavior', deed: 'Sharing helpful information',         type: 'positive', baseScore: 50 },
  { category: 'Online Behavior', deed: 'Educating / awareness content',       type: 'positive', baseScore: 50 },
  { category: 'Online Behavior', deed: 'Amplifying good causes',              type: 'positive', baseScore: 80 },
  { category: 'Online Behavior', deed: 'Calling out injustice responsibly',   type: 'positive', baseScore: 120 },
  { category: 'Online Behavior', deed: 'Hate comments',                       type: 'negative', baseScore: -50 },
  { category: 'Online Behavior', deed: 'Trolling',                            type: 'negative', baseScore: -80 },
  { category: 'Online Behavior', deed: 'Doxxing',                             type: 'negative', baseScore: -120 },
  { category: 'Online Behavior', deed: 'Spreading misinformation',            type: 'negative', baseScore: -50 },
  { category: 'Online Behavior', deed: 'Cancel mob participation',            type: 'negative', baseScore: -80 },
  { category: 'Online Behavior', deed: 'Impersonation',                       type: 'negative', baseScore: -120 },
  // Financial | Transactional
  { category: 'Financial | Transactional', deed: 'Lending money',                      type: 'positive', baseScore: 100 },
  { category: 'Financial | Transactional', deed: 'Donating',                           type: 'positive', baseScore: 200 },
  { category: 'Financial | Transactional', deed: 'Paying fairly',                      type: 'positive', baseScore: 100 },
  { category: 'Financial | Transactional', deed: 'Supporting small businesses',        type: 'positive', baseScore: 200 },
  { category: 'Financial | Transactional', deed: 'Funding education / causes',         type: 'positive', baseScore: 300 },
  { category: 'Financial | Transactional', deed: 'Scamming / fraud',                   type: 'negative', baseScore: -200 },
  { category: 'Financial | Transactional', deed: 'Not repaying loans',                 type: 'negative', baseScore: -100 },
  { category: 'Financial | Transactional', deed: 'Exploiting workers',                 type: 'negative', baseScore: -300 },
  { category: 'Financial | Transactional', deed: 'Bribery',                            type: 'negative', baseScore: -300 },
  { category: 'Financial | Transactional', deed: 'Tax evasion',                        type: 'negative', baseScore: -200 },
  { category: 'Financial | Transactional', deed: 'Financial manipulation',             type: 'negative', baseScore: -100 },
  // Professional | Power Use
  { category: 'Professional | Power Use', deed: 'Creating jobs',                           type: 'positive', baseScore: 600 },
  { category: 'Professional | Power Use', deed: 'Ethical leadership',                      type: 'positive', baseScore: 400 },
  { category: 'Professional | Power Use', deed: 'Fair hiring',                             type: 'positive', baseScore: 200 },
  { category: 'Professional | Power Use', deed: 'Whistleblowing',                          type: 'positive', baseScore: 600 },
  { category: 'Professional | Power Use', deed: 'Building useful products',                type: 'positive', baseScore: 400 },
  { category: 'Professional | Power Use', deed: 'Abuse of power',                          type: 'negative', baseScore: -400 },
  { category: 'Professional | Power Use', deed: 'Workplace harassment',                    type: 'negative', baseScore: -600 },
  { category: 'Professional | Power Use', deed: 'Discrimination',                          type: 'negative', baseScore: -400 },
  { category: 'Professional | Power Use', deed: 'Corruption',                              type: 'negative', baseScore: -400 },
  { category: 'Professional | Power Use', deed: 'Exploitation',                            type: 'negative', baseScore: -200 },
  { category: 'Professional | Power Use', deed: 'Unethical decisions affecting others',    type: 'negative', baseScore: -200 },
  // Community | Public Impact
  { category: 'Community | Public Impact', deed: 'Volunteering',                                   type: 'positive', baseScore: 150 },
  { category: 'Community | Public Impact', deed: 'Organizing community help',                      type: 'positive', baseScore: 300 },
  { category: 'Community | Public Impact', deed: 'Environmental action (cleanup, planting)',       type: 'positive', baseScore: 500 },
  { category: 'Community | Public Impact', deed: 'Disaster relief participation',                  type: 'positive', baseScore: 300 },
  { category: 'Community | Public Impact', deed: 'Public nuisance',                               type: 'negative', baseScore: -150 },
  { category: 'Community | Public Impact', deed: 'Vandalism',                                      type: 'negative', baseScore: -300 },
  { category: 'Community | Public Impact', deed: 'Environmental damage',                           type: 'negative', baseScore: -300 },
  { category: 'Community | Public Impact', deed: 'Inciting unrest',                               type: 'negative', baseScore: -500 },
  { category: 'Community | Public Impact', deed: 'Destroying public property',                    type: 'negative', baseScore: -300 },
  // Health | Safety
  { category: 'Health | Safety', deed: 'Helping injured people',      type: 'positive', baseScore: 300 },
  { category: 'Health | Safety', deed: 'Donating blood/organs',       type: 'positive', baseScore: 600 },
  { category: 'Health | Safety', deed: 'Saving someone in danger',   type: 'positive', baseScore: 900 },
  { category: 'Health | Safety', deed: 'Promoting safety',            type: 'positive', baseScore: 300 },
  { category: 'Health | Safety', deed: 'Drunk driving',               type: 'negative', baseScore: -600 },
  { category: 'Health | Safety', deed: 'Negligence causing harm',     type: 'negative', baseScore: -300 },
  { category: 'Health | Safety', deed: 'Endangering others',          type: 'negative', baseScore: -900 },
  { category: 'Health | Safety', deed: 'Ignoring safety protocols',   type: 'negative', baseScore: -300 },
  // Legal | Criminal
  { category: 'Legal | Criminal', deed: 'Reporting crime responsibly',         type: 'positive', baseScore: 200 },
  { category: 'Legal | Criminal', deed: 'Cooperating with law enforcement',   type: 'positive', baseScore: 300 },
  { category: 'Legal | Criminal', deed: 'Legal advocacy',                     type: 'positive', baseScore: 200 },
  { category: 'Legal | Criminal', deed: 'Theft',                              type: 'negative', baseScore: -300 },
  { category: 'Legal | Criminal', deed: 'Assault',                            type: 'negative', baseScore: -500 },
  { category: 'Legal | Criminal', deed: 'Kidnapping',                         type: 'negative', baseScore: -700 },
  { category: 'Legal | Criminal', deed: 'Sexual assault',                     type: 'negative', baseScore: -900 },
  { category: 'Legal | Criminal', deed: 'Murder',                             type: 'negative', baseScore: -1000 },
  { category: 'Legal | Criminal', deed: 'Organized crime',                    type: 'negative', baseScore: -1000 },
  // Large Scale | Systemic
  { category: 'Large Scale | Systemic', deed: 'Policy improving lives',                     type: 'positive', baseScore: 500 },
  { category: 'Large Scale | Systemic', deed: 'Large-scale philanthropy',                   type: 'positive', baseScore: 800 },
  { category: 'Large Scale | Systemic', deed: 'Infrastructure development',                 type: 'positive', baseScore: 500 },
  { category: 'Large Scale | Systemic', deed: 'Conflict resolution',                        type: 'positive', baseScore: 800 },
  { category: 'Large Scale | Systemic', deed: 'War crimes',                                type: 'negative', baseScore: -1000 },
  { category: 'Large Scale | Systemic', deed: 'Genocide',                                  type: 'negative', baseScore: -1000 },
  { category: 'Large Scale | Systemic', deed: 'Mass corruption',                           type: 'negative', baseScore: -1000 },
  { category: 'Large Scale | Systemic', deed: 'Large-scale exploitation',                  type: 'negative', baseScore: -1000 },
  { category: 'Large Scale | Systemic', deed: 'Economic harm affecting populations',       type: 'negative', baseScore: -800 },
  // Extreme Impact
  { category: 'Extreme Impact', deed: 'Saving a life',                                  type: 'positive', baseScore: 1000 },
  { category: 'Extreme Impact', deed: 'Saving multiple lives',                          type: 'positive', baseScore: 1500 },
  { category: 'Extreme Impact', deed: 'Large rescue',                                   type: 'positive', baseScore: 2500 },
  { category: 'Extreme Impact', deed: 'Mass rescue / disaster intervention',            type: 'positive', baseScore: 3500 },
  { category: 'Extreme Impact', deed: 'City-scale life impact / relief',               type: 'positive', baseScore: 5000 },
  { category: 'Extreme Impact', deed: 'Nation-scale humanitarian action',              type: 'positive', baseScore: 8000 },
  { category: 'Extreme Impact', deed: 'Global / historic life-saving impact',         type: 'positive', baseScore: 10000 },
  { category: 'Extreme Impact', deed: 'Murder / rape',                                 type: 'negative', baseScore: -1000 },
  { category: 'Extreme Impact', deed: 'Multiple victims',                              type: 'negative', baseScore: -1500 },
  { category: 'Extreme Impact', deed: 'Mass violence incident',                        type: 'negative', baseScore: -2500 },
  { category: 'Extreme Impact', deed: 'Large-scale violent event / riot causing deaths', type: 'negative', baseScore: -3500 },
  { category: 'Extreme Impact', deed: 'City-scale harm / coordinated violence',       type: 'negative', baseScore: -5000 },
  { category: 'Extreme Impact', deed: 'Nation-scale harm / war-level impact',         type: 'negative', baseScore: -8000 },
  { category: 'Extreme Impact', deed: 'Genocide / war crimes / systemic mass killing', type: 'negative', baseScore: -10000 },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────────

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
    ]),
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
    ? { category: 'Social | Interpersonal', deed: 'Public kindness to strangers', type: 'positive', baseScore: 50 }
    : { category: 'Social | Interpersonal', deed: 'Public humiliation',           type: 'negative', baseScore: -100 };
}

export function resolveSheetBaseImpactFromAdminImpact(
  finalImpact: number,
  fallbackType: SheetImpactType,
): SheetScoringIndexRow {
  const type: SheetImpactType = finalImpact > 0 ? 'positive' : finalImpact < 0 ? 'negative' : fallbackType;
  const target = Math.abs(finalImpact) * 10;
  const candidates = SHEET_SCORING_INDEX.filter((row) => row.type === type);
  if (!candidates.length || target === 0) return resolveSheetBaseImpact('', type);
  return candidates.reduce((best, row) =>
    Math.abs(Math.abs(row.baseScore) - target) < Math.abs(Math.abs(best.baseScore) - target) ? row : best,
  );
}

// ── Event multipliers ──────────────────────────────────────────────────────────

export type EventMultipliers = {
  identity:       number; // IY  0.5 – 1.5
  power:          number; // P   0.5 – 3
  means:          number; // M   0.5 – 3
  environment:    number; // E   0.5 – 3
  awareness:      number; // AW  0.5 – 3
  ability:        number; // AB  0.5 – 1
  circumstances:  number; // C   0.5 – 3  (per event)
  responsibility: number; // RY  0.5 – 3
  intent:         number; // IN  0.5 – 3  (per event)
  reputation:     number; // RP  0.5 – 3
};

export type WorkbookMultiplierKey = keyof EventMultipliers;

export const WORKBOOK_FORMULA_VERSION   = 'workbook-v1';
export const WORKBOOK_DECAY_DENOMINATOR = 1000;

export const DEFAULT_MULTIPLIERS: EventMultipliers = {
  identity: 1, power: 1, means: 1, environment: 1, awareness: 1,
  ability: 1, circumstances: 1, responsibility: 1, intent: 1, reputation: 1,
};

/** Map the 8 onboarding-derived dimension scores into the event multiplier shape. */
export function profileMultipliersFromUser(
  user: ScoringAppUser,
  perEvent?: { circumstances?: number; intent?: number },
): EventMultipliers {
  const dims  = calcProfileScores(user);
  const byKey: Record<string, number> = {};
  for (const d of dims) byKey[d.key] = d.value;
  return {
    identity:       byKey.IY ?? 1,
    power:          byKey.P  ?? 1,
    means:          byKey.M  ?? 1,
    environment:    byKey.E  ?? 1,
    awareness:      byKey.AW ?? 1,
    ability:        byKey.AB ?? 1,
    responsibility: byKey.RY ?? 1,
    reputation:     byKey.RP ?? 1,
    circumstances:  perEvent?.circumstances ?? 1,
    intent:         perEvent?.intent        ?? 1,
  };
}

export function calcMultiplierQuotient(m: EventMultipliers): number {
  return roundTo(
    m.reputation * m.intent * m.identity * m.power * m.means *
    m.environment * m.ability * m.circumstances * m.responsibility * m.awareness,
    4,
  );
}

// ── Workbook lookup tables ─────────────────────────────────────────────────────

const WORKBOOK_ROLE_POWER: Record<string, number> = {
  student_unemployed: 0.5, student: 0.5, unemployed: 0.5,
  individual_contributor_job: 1, individual_contributor: 1,
  manager: 1.5, founder_business_owner: 2,
  public_figure_influencer: 2.5,
  government_political_role: 3, government_political: 3,
};

const WORKBOOK_REACH_RESPONSIBILITY: Record<string, number> = {
  none: 0.5, '1k': 1, '1k_10k': 1.5, '10k_100k': 2,
  '100k_1m': 2.5, '1m': 3, '10m_100m': 3, '100m': 3,
};

const WORKBOOK_EDUCATION_AWARENESS: Record<string, number> = {
  no_formal_education: 0.5, no_formal: 0.5,
  school: 1, undergraduate: 1.5, postgraduate: 2,
  doctorate_specialized: 2.5, field_contributor: 3,
};

const WORKBOOK_SPECIALIZED_IDENTITY: Record<string, number> = {
  no: 0.5, some_experience: 1, professional: 1.5, expert: 2,
};

const WORKBOOK_MANAGEMENT_MEANS: Record<string, number> = {
  none: 1, small_team_limited_control: 1.5, moderate_responsibility: 2,
  large_team_major_decisions: 2.5,
  organizational_institutional_control: 3, organizational_institutional: 3,
};

const WORKBOOK_REGION_ENVIRONMENT: Record<string, number> = {
  syria_palestine_lebanon: 0.5, rest_of_the_world: 1,
  rest_of_asia_rest_of_africa: 1.5,
  india_se_asia_north_africa_south_america: 2, india: 2,
  gcc: 2.5, east_asia_russia_east_europe_middle_east: 2.5,
  usa_canada: 3, us_west_europe_aus_nz: 3, west_europe: 3,
};

const WORKBOOK_ABILITY: Record<string, number> = {
  yes: 0.5, prefer_not_to_say: 1, no: 1,
};

const WORKBOOK_LIFESTYLE_CIRCUMSTANCES: Record<string, number> = {
  high_pressure: 0.5, balanced: 1, manageable: 1.5,
  comfortable: 2, well_supported: 2.5, ideal: 3,
};

function lookupWorkbookValue(
  value: string | undefined,
  table: Record<string, number>,
  fallback = 1,
): number {
  if (!value) return fallback;
  return table[normalizeLookup(value)] ?? fallback;
}

export function profileMultipliersFromWorkbookProfile(
  profile: {
    role?: string;
    reach?: string;
    followers?: string;
    educationWorkbook?: string;
    education?: string;
    specializedFieldWorkbook?: string;
    specializedField?: string;
    managementWorkbook?: string;
    managesMoneyPeopleSystem?: string;
    disability?: string;
    physicalIntellectualLimitations?: string;
    lifestyle?: string;
    region?: string;
    opposedPosts?: number;
  },
  perEvent?: { repetitionPattern?: number; intent?: number; circumstances?: number },
): EventMultipliers {
  const reach       = profile.reach      ?? profile.followers;
  const specialized = profile.specializedFieldWorkbook ?? profile.specializedField;
  const education   = profile.educationWorkbook        ?? profile.education;
  const management  = profile.managementWorkbook       ?? profile.managesMoneyPeopleSystem;
  const ability     = profile.disability               ?? profile.physicalIntellectualLimitations;
  const repetition  = perEvent?.repetitionPattern ?? Math.min(3, 0.5 + ((profile.opposedPosts ?? 0) / 10));

  return {
    reputation:     repetition,
    intent:         perEvent?.intent ?? 1,
    identity:       Math.min(3, lookupWorkbookValue(specialized, WORKBOOK_SPECIALIZED_IDENTITY, 1)),
    power:          lookupWorkbookValue(profile.role,       WORKBOOK_ROLE_POWER,                1),
    means:          lookupWorkbookValue(management,         WORKBOOK_MANAGEMENT_MEANS,          1),
    environment:    lookupWorkbookValue(profile.region,     WORKBOOK_REGION_ENVIRONMENT,        1),
    ability:        lookupWorkbookValue(ability,            WORKBOOK_ABILITY,                   1),
    circumstances:  perEvent?.circumstances ?? lookupWorkbookValue(profile.lifestyle, WORKBOOK_LIFESTYLE_CIRCUMSTANCES, 1),
    responsibility: lookupWorkbookValue(reach,              WORKBOOK_REACH_RESPONSIBILITY,      1),
    awareness: Math.max(
      lookupWorkbookValue(education,   WORKBOOK_EDUCATION_AWARENESS,    1),
      Math.min(3, lookupWorkbookValue(specialized, WORKBOOK_SPECIALIZED_IDENTITY, 1) + 0.5),
    ),
  };
}

export const calcWorkbookMultiplierQuotient = calcMultiplierQuotient;

// Δ = BaseScore × (RP × IN × IY × P × M × E × AB × C × RY × AW) / 10
export function calcDelta(baseImpact: number, m: EventMultipliers): number {
  return roundTo((baseImpact * calcMultiplierQuotient(m)) / 10, 1);
}
export const calcWorkbookDelta = calcDelta;

// ── Ledger row ─────────────────────────────────────────────────────────────────

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
    reputation:        multipliers.reputation,
    intent:            multipliers.intent,
    profileId,
    identity:          multipliers.identity,
    power:             multipliers.power,
    means:             multipliers.means,
    environment:       multipliers.environment,
    ability:           multipliers.ability,
    circumstances:     multipliers.circumstances,
    responsibility:    multipliers.responsibility,
    awareness:         multipliers.awareness,
    multiplierQuotient: calcMultiplierQuotient(multipliers),
    delta:             calcDelta(baseScore, multipliers),
    weekId,
  };
}

// ── Decay & score application ──────────────────────────────────────────────────

export function sheetDecay(delta: number): number {
  const abs = Math.abs(delta);
  return abs / (abs + WORKBOOK_DECAY_DENOMINATOR);
}

export function applySheetScore(
  previousScore: number,
  delta: number,
): { decay: number; score: number } {
  const decay = sheetDecay(delta);
  return { decay, score: roundTo(previousScore + delta * (decay + 1), 1) };
}

export const workbookDecay      = sheetDecay;
export const applyWorkbookScore = applySheetScore;

// ── Weekly score tracker ───────────────────────────────────────────────────────

export function calcSheetScoreTracker(input: {
  baseScore?: number;
  w1Delta: number;
  w2P?: number;
  w2N?: number;
  w2Delta?: number;
  w3Delta?: number;
}) {
  const baseScore = input.baseScore ?? BASE_SCORE;
  const w1 = applySheetScore(baseScore, input.w1Delta);
  const w2Delta = input.w2Delta ?? (input.w2P ?? 0) + (input.w2N ?? 0);
  const w2 = applySheetScore(w1.score, w2Delta);
  const w3Delta = input.w3Delta ?? 0;
  const w3 = applySheetScore(w2.score, w3Delta);
  return {
    baseScore,
    w1Delta: input.w1Delta, w1Decay: w1.decay, w1Score: w1.score,
    w2P: input.w2P ?? 0, w2N: input.w2N ?? 0, w2Delta, w2Decay: w2.decay, w2Score: w2.score,
    w3Delta, w3Decay: w3.decay, w3Score: w3.score,
    finalScore: w3.score,
  };
}

export const calcWorkbookScoreTracker = calcSheetScoreTracker;

// ── Credibility ────────────────────────────────────────────────────────────────

export function calcProfileCredibility(input: {
  baseCredibility?: number;
  trustBadgeBonus?: number;
  opposedPosts?: number;
  disputeLosses?: number;
  aiFlaggedPosts?: number;
}) {
  const baseCredibility  = input.baseCredibility  ?? 80;
  const trustBadgeBonus  = input.trustBadgeBonus  ?? 0;
  const totalCredibility = clamp(baseCredibility + trustBadgeBonus, 0, 100);
  const updatedCredibility = clamp(
    totalCredibility
      - (input.opposedPosts  ?? 0)
      - (input.disputeLosses ?? 0) * 2.5
      - (input.aiFlaggedPosts ?? 0) * 5,
    0, 100,
  );
  return {
    baseCredibility, trustBadgeBonus, totalCredibility,
    opposedPosts:    input.opposedPosts   ?? 0,
    disputeLosses:   input.disputeLosses  ?? 0,
    aiFlaggedPosts:  input.aiFlaggedPosts ?? 0,
    updatedCredibility,
  };
}

export function credibilityWeight(credibility: number | undefined, fallback = 50): number {
  return clamp(typeof credibility === 'number' ? credibility : fallback, 0, 100) / 100;
}

// ── Ledger entry & delta application ──────────────────────────────────────────

export type LedgerEntry = {
  t: string;             // ISO timestamp
  delta: number;         // signed Δ applied
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

export function applyDeltaToLedger(
  currentScore: number | undefined,
  delta: number,
  entry: Omit<LedgerEntry, 'delta'>,
  history: LedgerEntry[] = [],
): { score: number; history: LedgerEntry[] } {
  const base = typeof currentScore === 'number' ? currentScore : BASE_SCORE;
  const { score } = applySheetScore(base, delta);
  return { score, history: [...history, { ...entry, delta, decay: sheetDecay(delta) }] };
}

// ── Weekly bucket aggregation ──────────────────────────────────────────────────

export const MOMENTUM_GAMMA = 0.2;

export function weeklyTotals(
  entries: LedgerEntry[],
  windowStart: Date,
  windowEnd: Date,
): { P: number; N: number } {
  let P = 0, N = 0;
  for (const e of entries) {
    const t = new Date(e.t).getTime();
    if (t < windowStart.getTime() || t > windowEnd.getTime()) continue;
    if (e.delta > 0) P += e.delta;
    else N += e.delta;
  }
  return { P, N };
}

export function applyWeeklyMomentum(
  currentScore: number,
  P: number,
  N: number,
): { newScore: number; ratio: number; decayFactor: number } {
  const delta = P + N;
  const { decay, score } = applySheetScore(currentScore, delta);
  return { newScore: score, ratio: decay, decayFactor: decay };
}

export function sumDeltasByAge(
  entries: Array<{ delta: number; t?: string; timestamp?: string }>,
  now = new Date(),
) {
  let w1Delta = 0, w2Delta = 0, w3Delta = 0;
  const nowMs = now.getTime();
  for (const entry of entries) {
    const when = entry.t ?? entry.timestamp;
    if (!when || typeof entry.delta !== 'number') continue;
    const ageDays = Math.max(0, (nowMs - new Date(when).getTime()) / 86_400_000);
    if (ageDays <= 7)       w1Delta += entry.delta;
    else if (ageDays <= 30) w2Delta += entry.delta;
    else                    w3Delta += entry.delta;
  }
  return {
    w1Delta: roundTo(w1Delta, 1),
    w2Delta: roundTo(w2Delta, 1),
    w3Delta: roundTo(w3Delta, 1),
  };
}

export function calcWorkbookScoreFromEntries(
  entries: Array<{ delta: number; t?: string; timestamp?: string }>,
  baseScore = BASE_SCORE,
  now = new Date(),
) {
  return calcWorkbookScoreTracker({ baseScore, ...sumDeltasByAge(entries, now) });
}
