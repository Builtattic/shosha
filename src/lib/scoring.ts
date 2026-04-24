import type { Breakdown, ScoreCause } from '@/types';
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
