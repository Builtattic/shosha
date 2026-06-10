import type { ApiResponse } from '@/types/common';
import type { FeedReport } from '@/types/feed';

const MOCK_REPORTER = {
  id: 'usr_sys',
  username: 'shosha_verified',
  display_name: 'Shosha Verified',
  photo_url: 'https://api.dicebear.com/9.x/initials/svg?seed=SV',
};

const MOCK_FEED_REPORTS: FeedReport[] = [
  {
    id: 'rep_001',
    type: 'positive',
    title: 'Environmental Action',
    description:
      'Led community clean-up drive removing 2 tonnes of waste from local riverbank. Coordinated 80+ volunteers over three weekends.',
    deed: 'Environmental action (cleanup, planting)',
    base_score: 12,
    status: 'APPROVED',
    created_at: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    is_irl: false,
    evidence_source_url: 'https://example.com/cleanup',
    public_anonymous: false,
    media: [],
    category: 'Community',
    stats: { aligns: 142, opposes: 3, comments: 18, shares: 27 },
    report_score: 14,
    viewer: null,
    account: {
      id: 'acc_p001',
      display_name: 'Priya Sharma',
      handle: 'priyasharma',
      platform: 'website',
      score: 1240,
    },
    reporter: MOCK_REPORTER,
    can_request_moderation: false,
  },
  {
    id: 'rep_002',
    type: 'negative',
    title: 'Fraud',
    description:
      'Multiple credible sources confirm deliberate data misrepresentation in quarterly investor filings. Internal whistleblower corroborates.',
    deed: 'Scamming / fraud',
    base_score: -18,
    status: 'APPROVED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    is_irl: false,
    evidence_source_url: 'https://example.com/filing',
    public_anonymous: false,
    media: [],
    category: 'Finance',
    stats: { aligns: 89, opposes: 12, comments: 44, shares: 61 },
    report_score: -22,
    viewer: null,
    account: {
      id: 'acc_p002',
      display_name: 'Marcus Webb',
      handle: 'marcuswebb',
      platform: 'X',
      score: 620,
    },
    reporter: MOCK_REPORTER,
    can_request_moderation: true,
  },
  {
    id: 'rep_003',
    type: 'positive',
    title: 'Open Source Contribution',
    description:
      'Published open-source library that reduces ML model inference time by 40%. Adopted by 3 Fortune 500 companies within 6 months of release.',
    deed: 'Building useful products',
    base_score: 19,
    status: 'APPROVED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    is_irl: false,
    evidence_source_url: 'https://example.com/oss',
    public_anonymous: false,
    media: [],
    category: 'Technology',
    stats: { aligns: 310, opposes: 7, comments: 55, shares: 120 },
    report_score: 19,
    viewer: null,
    account: {
      id: 'acc_p003',
      display_name: 'Aiden Park',
      handle: 'aidenpark',
      platform: 'linkedin',
      score: 1780,
    },
    reporter: MOCK_REPORTER,
    can_request_moderation: false,
  },
  {
    id: 'rep_004',
    type: 'negative',
    title: 'Conflict of Interest',
    description:
      'Repeatedly failed to disclose undeclared conflicts of interest on advisory board positions while writing public policy recommendations.',
    deed: 'Corruption',
    base_score: -12,
    status: 'APPROVED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    is_irl: false,
    evidence_source_url: 'https://example.com/conflict',
    public_anonymous: true,
    media: [],
    category: 'Governance',
    stats: { aligns: 57, opposes: 22, comments: 30, shares: 14 },
    report_score: -12,
    viewer: null,
    account: {
      id: 'acc_p004',
      display_name: 'Helena Cross',
      handle: 'helenacross',
      platform: 'website',
      score: 490,
    },
    reporter: null,
    can_request_moderation: false,
  },
  {
    id: 'rep_005',
    type: 'positive',
    title: 'Philanthropy',
    description:
      'Donated 30% of annual salary to establish scholarship fund for first-generation university students in rural districts.',
    deed: 'Funding education / causes',
    base_score: 17,
    status: 'APPROVED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    is_irl: false,
    evidence_source_url: 'https://example.com/scholarship',
    public_anonymous: false,
    media: [],
    category: 'Education',
    stats: { aligns: 204, opposes: 1, comments: 22, shares: 88 },
    report_score: 17,
    viewer: null,
    account: {
      id: 'acc_p005',
      display_name: 'David Nwosu',
      handle: 'davidnwosu',
      platform: 'website',
      score: 1540,
    },
    reporter: MOCK_REPORTER,
    can_request_moderation: false,
  },
];

function filterFeed(reports: FeedReport[], filter: string): FeedReport[] {
  switch (filter) {
    case 'top':
      return [...reports].sort(
        (a, b) => Math.abs(b.base_score ?? 0) - Math.abs(a.base_score ?? 0),
      );
    case 'following':
      return [];
    case 'near':
      return reports.slice(0, 2);
    case 'for_you':
    default:
      return reports;
  }
}

export async function getFeed(
  limit = 30,
  _cursor?: string,
): Promise<ApiResponse<{ items: FeedReport[]; next_cursor: string | null }>> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const items = MOCK_FEED_REPORTS.slice(0, limit);
  return {
    ok: true,
    data: { items, next_cursor: null },
  };
}

export async function getFeedByFilter(
  filter: string,
): Promise<ApiResponse<FeedReport[]>> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { ok: true, data: filterFeed(MOCK_FEED_REPORTS, filter) };
}

export { MOCK_FEED_REPORTS };
