import { fail, ok } from '@/lib/api';
import { assertLimit, getRequestKey, rateLimits } from '@/lib/ratelimit';
import { searchSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';
import { getCurrentUser } from '@/lib/auth';
import { canViewProfileField } from '@/lib/profilePrivacy';
import { discoverSocialAccounts, type SocialDiscoveryResult } from '@/lib/shoshaDiscovery';

const emptyDiscoveryResult: SocialDiscoveryResult = {
  candidates: [],
  sources: [],
  searchQueries: [],
  grounded: false
};

type Candidate = {
  platform: string;
  username: string;
  displayName: string;
  sourceUrl: string;
  bio: string;
  followers?: string;
  verified?: boolean;
  confidence: number;
  reason: string;
};

function normalizeHandle(value: string) {
  return value.replace(/^@/, '').trim().toLowerCase();
}

function dedupeAccounts(accounts: accountsRepo.AccountRecord[]) {
  const byId = new Map<string, accountsRepo.AccountRecord>();
  for (const account of accounts) byId.set(account._id, account);
  return Array.from(byId.values());
}

function dedupeCandidates(candidates: Candidate[]) {
  const seen = new Set<string>();
  const result: Candidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.platform}:${normalizeHandle(candidate.username)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function sanitizeWebsiteAccountForViewer(
  account: accountsRepo.AccountRecord,
  user: usersRepo.AppUser | undefined,
  viewer: usersRepo.AppUser | null
) {
  if (!user) return account;
  return {
    ...account,
    followers: String((user.followers ?? []).length),
    region: canViewProfileField(user, viewer, 'location') ? account.region : undefined,
    sourceUrl: canViewProfileField(user, viewer, 'website') ? account.sourceUrl : undefined,
    socialLinks: canViewProfileField(user, viewer, 'socialLinks') ? account.socialLinks : undefined,
  };
}

export async function GET(request: Request) {
  const limit = await assertLimit(rateLimits.search, getRequestKey(request));
  if (!limit.allowed) return fail('rate_limited', 'The index needs a minute before another search.', 429);

  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: searchParams.get('q') ?? '' });
  if (!parsed.success) return fail('validation_error', 'Search query is too long.', 422);
  const viewer = await getCurrentUser().catch(() => null);

  // Fetch and filter local accounts in-memory (more reliable than RTDB's limited search)
  const allAccounts = await accountsRepo.listAll(1000).catch(() => []);
  const accounts = allAccounts.filter(a => 
    a.username.toLowerCase().includes(parsed.data.q.toLowerCase()) ||
    a.displayName.toLowerCase().includes(parsed.data.q.toLowerCase())
  ).slice(0, 20);

  // Fetch and filter platform users in-memory
  const allUsers = await usersRepo.listAll(500).catch(() => []);
  const matchedUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(parsed.data.q.toLowerCase()) || 
    (viewer?._id === u._id && u.email.toLowerCase().includes(parsed.data.q.toLowerCase())) ||
    u.name?.toLowerCase().includes(parsed.data.q.toLowerCase())
  ).slice(0, 10);
  const userAccounts = await Promise.all(
    matchedUsers.map((user) => accountsRepo.ensureWebsiteAccountForUser(user))
  );

  const discoverParam = searchParams.get('discover');
  const fallbackDiscover = accounts.length === 0 && matchedUsers.length === 0 && discoverParam !== '0' && discoverParam !== 'false';
  const shouldDiscover = discoverParam === 'force' || discoverParam === '1' || discoverParam === 'true' || fallbackDiscover;
  
  let candidates: any[] = [];
  let sources: any[] = [];
  let searchQueries: string[] = [];
  let grounded = false;
  let reason = '';

  if (shouldDiscover && parsed.data.q.trim().length >= 2) {
    const discovery = await discoverSocialAccounts(parsed.data.q).catch(() => emptyDiscoveryResult);
    const existingIds = new Set([...accounts, ...userAccounts].map((account) => `${account.platform}:${normalizeHandle(account.username)}`));
    candidates = discovery.candidates.filter((candidate) => !existingIds.has(`${candidate.platform}:${normalizeHandle(candidate.username)}`));
    sources = discovery.sources;
    searchQueries = discovery.searchQueries;
    grounded = discovery.grounded;
    reason = discovery.reason ?? '';
  }

  const userByWebsiteAccountId = new Map(
    matchedUsers.map((user) => [accountsRepo.deriveId('website', user.username), user])
  );
  const resultAccounts = dedupeAccounts([...userAccounts, ...accounts])
    .map((account) => sanitizeWebsiteAccountForViewer(account, userByWebsiteAccountId.get(account._id), viewer))
    .slice(0, 30);

  // Convert existing accounts to candidate format for UI consistency (especially for ReportModal)
  const accountCandidates = resultAccounts.map(a => {
    const user = matchedUsers.find((matched) => accountsRepo.deriveId('website', matched.username) === a._id);
    const websiteVisible = user ? canViewProfileField(user, viewer, 'website') : true;
    return {
    platform: a.platform,
    username: a.username,
    displayName: a.displayName,
    sourceUrl: websiteVisible ? a.sourceUrl || user?.websiteUrl || '' : '',
    bio: a.bio || '',
    followers: a.followers || '',
    verified: a.verified || false,
    confidence: 1,
    reason: 'Existing Account Match'
    };
  });

  // Merge all candidates: Local Accounts + Match Platform Users + Discovered Results
  const allCandidates = dedupeCandidates([...accountCandidates, ...candidates]);

  return ok({
    accounts: resultAccounts,
    candidates: allCandidates,
    sources,
    searchQueries,
    grounded,
    reason
  });
}
