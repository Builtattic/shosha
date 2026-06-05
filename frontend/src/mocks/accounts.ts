import type { ApiResponse } from '@/types/common';
import type { FeedReport } from '@/types/feed';
import type { AccountDetail, SocialLink } from '@/api/accounts';
import type { PaginatedResponse } from '@/types/common';
import { MOCK_FEED_REPORTS } from '@/mocks/feed';

export type SearchAccount = {
  _id: string;
  platform?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followers?: string;
  verified?: boolean;
  claimed?: boolean;
  claimable?: boolean;
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS: SearchAccount[] = [
  {
    _id: 'acc_1',
    username: 'elonmusk',
    displayName: 'Elon Musk',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=ElonMusk',
    verified: true,
    claimed: true,
    claimable: false,
    platform: 'X',
  },
  {
    _id: 'acc_2',
    username: 'satyanadella',
    displayName: 'Satya Nadella',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=SatyaNadella',
    verified: true,
    claimed: false,
    claimable: true,
    platform: 'LinkedIn',
  },
  {
    _id: 'acc_3',
    username: 'samaltman',
    displayName: 'Sam Altman',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=SamAltman',
    verified: false,
    claimed: false,
    claimable: true,
    platform: 'X',
  },
];

const MOCK_ACCOUNT_DETAIL: AccountDetail = {
  id: 'acc_p002',
  platform: 'X',
  handle: 'marcuswebb',
  display_name: 'Marcus Webb',
  bio: 'CFO. Former Goldman. Views are my own.',
  status: 'ACTIVE',
  owner_user_id: null,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
  report_count: 4,
  align_count: 247,
  oppose_count: 34,
  shosha_score: 620,
};

const MOCK_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'X', url: 'https://x.com/marcuswebb', is_verified: false },
  { platform: 'LinkedIn', url: 'https://linkedin.com/in/marcuswebb', is_verified: false },
];

// ── Mock functions ─────────────────────────────────────────────────────────────

export async function searchAccounts(q: string): Promise<ApiResponse<{ accounts: SearchAccount[] }>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const query = q.toLowerCase();
  const results = MOCK_ACCOUNTS.filter(
    (acc) =>
      acc.username.toLowerCase().includes(query) ||
      acc.displayName.toLowerCase().includes(query),
  );
  return { ok: true, data: { accounts: results } };
}

export async function getAccount(id: string): Promise<ApiResponse<{ account: AccountDetail }>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  // Try to match against a feed report's account to make it feel real
  const report = MOCK_FEED_REPORTS.find((r) => r.account._id === id);
  if (report) {
    return {
      ok: true,
      data: {
        account: {
          id,
          platform: report.account.platform ?? 'X',
          handle: report.account.username,
          display_name: report.account.displayName,
          bio: 'This account has been reported on Shosha.',
          status: 'ACTIVE',
          owner_user_id: null,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
          report_count: 2,
          align_count: report.stats?.aligns,
          oppose_count: report.stats?.opposes,
          shosha_score: report.account.score,
        },
      },
    };
  }
  return { ok: true, data: { account: MOCK_ACCOUNT_DETAIL } };
}

export async function getAccountSocialLinks(id: string): Promise<ApiResponse<{ links: SocialLink[] }>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  void id;
  return { ok: true, data: { links: MOCK_SOCIAL_LINKS } };
}

export async function listAccountReports(
  accountId: string,
  _cursor?: string,
): Promise<ApiResponse<PaginatedResponse<FeedReport>>> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const items = MOCK_FEED_REPORTS.filter((r) => r.account._id === accountId);
  // If no exact match, return a couple as sample data
  return {
    ok: true,
    data: { items: items.length ? items : MOCK_FEED_REPORTS.slice(0, 2), next_cursor: null },
  };
}

export async function createAccount(payload: {
  platform: string;
  handle: string;
  display_name?: string;
  bio?: string;
}): Promise<ApiResponse<{ account: AccountDetail }>> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    ok: true,
    data: {
      account: {
        id: `acc_new_${Date.now()}`,
        platform: payload.platform,
        handle: payload.handle,
        display_name: payload.display_name ?? null,
        bio: payload.bio ?? null,
        status: 'ACTIVE',
        owner_user_id: 'usr_mock123',
        created_at: new Date().toISOString(),
        report_count: 0,
        align_count: 0,
        oppose_count: 0,
        shosha_score: 1000,
      },
    },
  };
}
