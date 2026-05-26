// Engagement interaction weights
export const WEIGHT_ALIGNS = 1.2;
export const WEIGHT_OPPOSES = 0.8;
export const WEIGHT_COMMENTS = 1.6;
export const WEIGHT_SHARES = 2.0;

// Recency decay: half-life in hours (72h = ~3 days)
export const RECENCY_DECAY_HOURS = 72;

// Credibility clamp bounds
export const CREDIBILITY_MIN = 0.2;
export const CREDIBILITY_MAX = 1.25;

// Editorial boosts
export const BOOST_PINNED = 1000;
export const BOOST_FEATURED = 250;

// Safety multipliers
export const SAFETY_FABRICATED = 0.15;
export const SAFETY_CENSORED = 0.55;
export const SAFETY_BASE = 0.65;
export const SAFETY_CONFIDENCE_WEIGHT = 0.5;
export const SAFETY_MIN = 0.35;
export const SAFETY_MAX = 1.15;

// Minimum engagement to qualify for trending
export const MIN_TRENDING_ENGAGEMENT = 3;

type FeedRankStats = {
  aligns?: number;
  opposes?: number;
  comments?: number;
  shares?: number;
};

export type FeedRankInput = {
  createdAt?: string;
  reportScore?: number;
  baseScore?: number;
  credibilityWeight?: number;
  stats?: FeedRankStats;
  pinned?: boolean;
  featured?: boolean;
  aiVerdict?: {
    confidence?: number;
    abuseFlags?: string[];
    isAiFabricated?: boolean;
  } | null;
  adminDecision?: {
    finalImpact?: number;
  } | null;
  contentSafety?: {
    needsCensor?: boolean;
  };
};

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function reportEngagementScore(stats: FeedRankStats | undefined) {
  const aligns = safeNumber(stats?.aligns);
  const opposes = safeNumber(stats?.opposes);
  const comments = safeNumber(stats?.comments);
  const shares = safeNumber(stats?.shares);
  return Math.log1p(
    aligns * WEIGHT_ALIGNS +
    opposes * WEIGHT_OPPOSES +
    comments * WEIGHT_COMMENTS +
    shares * WEIGHT_SHARES
  );
}

export function reportSafetyMultiplier(report: FeedRankInput) {
  const confidence = safeNumber(report.aiVerdict?.confidence, 0.5);
  const hasAbuse = Boolean(report.aiVerdict?.abuseFlags?.length);
  const fabricated = Boolean(report.aiVerdict?.isAiFabricated);
  const needsCensor = Boolean(report.contentSafety?.needsCensor);
  if (fabricated || hasAbuse) return SAFETY_FABRICATED;
  if (needsCensor) return SAFETY_CENSORED;
  return Math.max(
    SAFETY_MIN,
    Math.min(SAFETY_MAX, SAFETY_BASE + confidence * SAFETY_CONFIDENCE_WEIGHT)
  );
}

export function socialFeedScore(report: FeedRankInput, now = new Date()) {
  const created = report.createdAt ? new Date(report.createdAt).getTime() : now.getTime();
  const ageHours = Math.max(0, (now.getTime() - created) / (60 * 60 * 1000));
  const recency = Math.exp(-ageHours / RECENCY_DECAY_HOURS);
  const delta = Math.abs(
    safeNumber(report.adminDecision?.finalImpact, safeNumber(report.reportScore, safeNumber(report.baseScore)))
  );
  const impact = Math.log1p(delta);
  const credibility = Math.max(
    CREDIBILITY_MIN,
    Math.min(CREDIBILITY_MAX, safeNumber(report.credibilityWeight, 1))
  );
  const engagement = reportEngagementScore(report.stats);
  const editorial = (report.pinned ? BOOST_PINNED : 0) + (report.featured ? BOOST_FEATURED : 0);
  return editorial + (impact + 1) * (engagement + 1) * recency * credibility * reportSafetyMultiplier(report);
}
