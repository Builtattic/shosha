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
  return Math.log1p(aligns * 1.2 + opposes * 0.8 + comments * 1.6 + shares * 2);
}

export function reportSafetyMultiplier(report: FeedRankInput) {
  const confidence = safeNumber(report.aiVerdict?.confidence, 0.5);
  const hasAbuse = Boolean(report.aiVerdict?.abuseFlags?.length);
  const fabricated = Boolean(report.aiVerdict?.isAiFabricated);
  const needsCensor = Boolean(report.contentSafety?.needsCensor);
  if (fabricated || hasAbuse) return 0.15;
  if (needsCensor) return 0.55;
  return Math.max(0.35, Math.min(1.15, 0.65 + confidence * 0.5));
}

export function socialFeedScore(report: FeedRankInput, now = new Date()) {
  const created = report.createdAt ? new Date(report.createdAt).getTime() : now.getTime();
  const ageHours = Math.max(0, (now.getTime() - created) / (60 * 60 * 1000));
  const recency = Math.exp(-ageHours / 72);
  const delta = Math.abs(
    safeNumber(report.adminDecision?.finalImpact, safeNumber(report.reportScore, safeNumber(report.baseScore)))
  );
  const impact = Math.log1p(delta);
  const credibility = Math.max(0.2, Math.min(1.25, safeNumber(report.credibilityWeight, 1)));
  const engagement = reportEngagementScore(report.stats);
  const editorial = (report.pinned ? 1000 : 0) + (report.featured ? 250 : 0);
  return editorial + (impact + 1) * (engagement + 1) * recency * credibility * reportSafetyMultiplier(report);
}
