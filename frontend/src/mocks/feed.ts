import type { ApiResponse } from '@/types/common';
import type { FeedReport, FeedFilter } from '@/types/feed';

const MOCK_REPORTER = {
  username: 'shosha_verified',
  name: 'Shosha Verified',
  photoUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=SV',
  role: 'admin',
};

const MOCK_FEED_REPORTS: FeedReport[] = [
  {
    _id: 'rep_001',
    type: 'positive',
    description: 'Led community clean-up drive removing 2 tonnes of waste from local riverbank. Coordinated 80+ volunteers over three weekends.',
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    category: 'Community',
    deed: 'Environmental Action',
    stats: { aligns: 142, opposes: 3, comments: 18, shares: 27 },
    reportScore: 14,
    baseScore: 12,
    adminDecision: { finalImpact: 14 },
    account: {
      _id: 'acc_p001',
      displayName: 'Priya Sharma',
      username: 'priyasharma',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya',
      verified: true,
      score: 1240,
      platform: 'website',
    },
    reporter: MOCK_REPORTER,
  },
  {
    _id: 'rep_002',
    type: 'negative',
    description: 'Multiple credible sources confirm deliberate data misrepresentation in quarterly investor filings. Internal whistleblower corroborates.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    category: 'Finance',
    deed: 'Fraud',
    stats: { aligns: 89, opposes: 12, comments: 44, shares: 61 },
    reportScore: -22,
    baseScore: -18,
    adminDecision: { finalImpact: -22 },
    account: {
      _id: 'acc_p002',
      displayName: 'Marcus Webb',
      username: 'marcuswebb',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Marcus',
      verified: false,
      score: 620,
    },
    reporter: MOCK_REPORTER,
    canRequestModeration: true,
  },
  {
    _id: 'rep_003',
    type: 'positive',
    description: 'Published open-source library that reduces ML model inference time by 40%. Adopted by 3 Fortune 500 companies within 6 months of release.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    category: 'Technology',
    deed: 'Open Source Contribution',
    stats: { aligns: 310, opposes: 7, comments: 55, shares: 120 },
    reportScore: 19,
    adminDecision: { finalImpact: 19 },
    account: {
      _id: 'acc_p003',
      displayName: 'Aiden Park',
      username: 'aidenpark',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Aiden',
      verified: true,
      score: 1780,
      platform: 'LinkedIn',
    },
    reporter: MOCK_REPORTER,
  },
  {
    _id: 'rep_004',
    type: 'negative',
    description: 'Repeatedly failed to disclose undeclared conflicts of interest on advisory board positions while writing public policy recommendations.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    category: 'Governance',
    deed: 'Conflict of Interest',
    stats: { aligns: 57, opposes: 22, comments: 30, shares: 14 },
    reportScore: -12,
    adminDecision: { finalImpact: -12 },
    account: {
      _id: 'acc_p004',
      displayName: 'Helena Cross',
      username: 'helenacross',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Helena',
      verified: false,
      score: 490,
    },
    reporter: null,
  },
  {
    _id: 'rep_005',
    type: 'positive',
    description: 'Donated 30% of annual salary to establish scholarship fund for first-generation university students in rural districts.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    category: 'Education',
    deed: 'Philanthropy',
    stats: { aligns: 204, opposes: 1, comments: 22, shares: 88 },
    reportScore: 17,
    adminDecision: { finalImpact: 17 },
    account: {
      _id: 'acc_p005',
      displayName: 'David Nwosu',
      username: 'davidnwosu',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=David',
      verified: true,
      score: 1540,
    },
    reporter: MOCK_REPORTER,
  },
];

function filterFeed(reports: FeedReport[], filter: FeedFilter): FeedReport[] {
  switch (filter) {
    case 'top':
      return [...reports].sort((a, b) => Math.abs(b.reportScore ?? 0) - Math.abs(a.reportScore ?? 0));
    case 'following':
      return []; // No following in mock mode
    case 'near':
      return reports.slice(0, 2);
    case 'for_you':
    default:
      return reports;
  }
}

export async function getFeed(filter: FeedFilter): Promise<ApiResponse<FeedReport[]>> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return {
    ok: true,
    data: filterFeed(MOCK_FEED_REPORTS, filter),
  };
}

export { MOCK_FEED_REPORTS };
