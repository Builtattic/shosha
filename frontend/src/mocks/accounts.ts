import type { ApiResponse } from '@/types/common';

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
  },
];

export async function searchAccounts(q: string): Promise<ApiResponse<{ accounts: SearchAccount[] }>> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const query = q.toLowerCase();
  const results = MOCK_ACCOUNTS.filter(
    (acc) =>
      acc.username.toLowerCase().includes(query) ||
      acc.displayName.toLowerCase().includes(query)
  );

  return {
    ok: true,
    data: { accounts: results },
  };
}
