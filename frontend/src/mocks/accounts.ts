import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { Account, AccountCreatePayload, AccountUpdatePayload, SocialLink } from '@/types/account';
import type { ReportListItem, ScoreHistoryEntry, WindowScoresRaw } from '@/api/accounts';

export type SearchAccount = Account & {
  claimed?: boolean;
  claimable?: boolean;
  verified?: boolean;
};

const MOCK_ACCOUNTS: SearchAccount[] = [
  {
    id: 'acc_1',
    platform: 'X',
    handle: 'elonmusk',
    display_name: 'Elon Musk',
    bio: null,
    status: 'ACTIVE',
    owner_user_id: null,
    created_at: new Date().toISOString(),
    score: 1000,
    score_breakdown: null,
    social_links: [],
    verified: true,
    claimed: true,
    claimable: false,
  },
  {
    id: 'acc_2',
    platform: 'LinkedIn',
    handle: 'satyanadella',
    display_name: 'Satya Nadella',
    bio: null,
    status: 'ACTIVE',
    owner_user_id: null,
    created_at: new Date().toISOString(),
    score: 1000,
    score_breakdown: null,
    social_links: [],
    verified: true,
    claimed: false,
    claimable: true,
  },
  {
    id: 'acc_3',
    platform: 'X',
    handle: 'samaltman',
    display_name: 'Sam Altman',
    bio: null,
    status: 'ACTIVE',
    owner_user_id: null,
    created_at: new Date().toISOString(),
    score: 1000,
    score_breakdown: null,
    social_links: [],
    verified: false,
    claimed: false,
    claimable: true,
  },
];

const MOCK_ACCOUNT_DETAIL: Account = {
  id: 'acc_p002',
  platform: 'X',
  handle: 'marcuswebb',
  display_name: 'Marcus Webb',
  bio: 'CFO. Former Goldman. Views are my own.',
  status: 'ACTIVE',
  owner_user_id: null,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
  score: 620,
  score_breakdown: null,
  social_links: [],
};

const MOCK_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'X', url: 'https://x.com/marcuswebb', is_verified: false },
  { platform: 'LinkedIn', url: 'https://linkedin.com/in/marcuswebb', is_verified: false },
];

const MOCK_REPORTS: ReportListItem[] = [
  {
    id: 'rep_1',
    title: 'Corporate governance concern',
    description: 'Filed regarding financial disclosures.',
    deed: 'Financial transparency',
    base_score: 45,
    type: 'negative',
    status: 'APPROVED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'rep_2',
    title: 'Community outreach',
    description: 'Positive community engagement noted.',
    deed: 'Community support',
    base_score: 30,
    type: 'positive',
    status: 'APPROVED',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export async function searchAccounts(q: string): Promise<ApiResponse<{ items: Account[] }>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const query = q.toLowerCase();
  const results = MOCK_ACCOUNTS.filter(
    (acc) =>
      acc.handle.toLowerCase().includes(query) ||
      (acc.display_name ?? '').toLowerCase().includes(query),
  );
  return { ok: true, data: { items: results } };
}

export async function getAccount(id: string): Promise<ApiResponse<{ account: Account }>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const found = MOCK_ACCOUNTS.find((a) => a.id === id);
  return { ok: true, data: { account: found ?? MOCK_ACCOUNT_DETAIL } };
}

export async function getAccountSocialLinks(
  id: string,
): Promise<ApiResponse<{ links: SocialLink[] }>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  void id;
  return { ok: true, data: { links: MOCK_SOCIAL_LINKS } };
}

export async function listAccountReports(
  accountId: string,
  _cursor?: string,
): Promise<ApiResponse<PaginatedResponse<ReportListItem>>> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  void accountId;
  return { ok: true, data: { items: MOCK_REPORTS, next_cursor: null } };
}

export async function createAccount(
  payload: AccountCreatePayload,
): Promise<ApiResponse<{ account: Account }>> {
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
        score: 1000,
        score_breakdown: null,
        social_links: [],
      },
    },
  };
}

export async function listAccounts(
  limit = 50,
  _cursor?: string,
  ownerUserId?: string,
): Promise<{ items: Account[]; next_cursor: string | null }> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const items = ownerUserId
    ? MOCK_ACCOUNTS.filter((a) => a.owner_user_id === ownerUserId)
    : MOCK_ACCOUNTS;
  return { items: items.slice(0, limit), next_cursor: null };
}

export async function updateAccount(
  accountId: string,
  payload: AccountUpdatePayload,
): Promise<Account> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ...MOCK_ACCOUNT_DETAIL, id: accountId, ...payload };
}

export async function addSocialLink(
  accountId: string,
  platform: string,
  url: string,
): Promise<SocialLink> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  void accountId;
  return { platform, url, is_verified: false };
}

export async function getAccountScoreHistory(
  id: string,
): Promise<ApiResponse<{ history: ScoreHistoryEntry[] }>> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  void id;
  return { ok: true, data: { history: [] } };
}

export async function getAccountScoreWindows(
  id: string,
): Promise<ApiResponse<{ window_scores: WindowScoresRaw | null }>> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  void id;
  return { ok: true, data: { window_scores: null } };
}
