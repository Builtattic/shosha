import { fail, ok } from '@/lib/api';
import { assertLimit, getRequestKey, rateLimits } from '@/lib/ratelimit';
import { searchSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as usersRepo from '@/lib/repos/users';
import { discoverSocialAccounts, type SocialDiscoveryResult } from '@/lib/shoshaDiscovery';

const emptyDiscoveryResult: SocialDiscoveryResult = {
  candidates: [],
  sources: [],
  searchQueries: [],
  grounded: false
};

export async function GET(request: Request) {
  const limit = await assertLimit(rateLimits.search, getRequestKey(request));
  if (!limit.allowed) return fail('rate_limited', 'The index needs a minute before another search.', 429);

  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: searchParams.get('q') ?? '' });
  if (!parsed.success) return fail('validation_error', 'Search query is too long.', 422);

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
    u.email.toLowerCase().includes(parsed.data.q.toLowerCase()) ||
    u.name?.toLowerCase().includes(parsed.data.q.toLowerCase())
  ).slice(0, 10);

  const discoverParam = searchParams.get('discover');
  const shouldDiscover = discoverParam === 'force' || (discoverParam !== '0' && discoverParam !== 'false' && discoverParam !== null);
  
  let candidates: any[] = [];
  let sources: any[] = [];
  let searchQueries: string[] = [];
  let grounded = false;
  let reason = '';

  if (shouldDiscover && parsed.data.q.trim().length >= 2) {
    const discovery = await discoverSocialAccounts(parsed.data.q).catch(() => emptyDiscoveryResult);
    const existingIds = new Set(accounts.map((account) => `${account.platform}:${account.username.toLowerCase()}`));
    candidates = discovery.candidates.filter((candidate) => !existingIds.has(`${candidate.platform}:${candidate.username}`));
    sources = discovery.sources;
    searchQueries = discovery.searchQueries;
    grounded = discovery.grounded;
    reason = discovery.reason ?? '';
  }

  // Merge users into candidates if they don't already exist as accounts
  const userCandidates = matchedUsers.map((u) => ({
    platform: 'website',
    username: u.username,
    displayName: u.name || u.username,
    sourceUrl: u.websiteUrl || `mailto:${u.email}`,
    bio: u.bio || 'Platform User',
    verified: true,
    confidence: 1,
    reason: 'Platform User Match'
  }));

  // Deduplicate user candidates against existing accounts
  const existingAccountUsernames = new Set(accounts.map(a => a.username.toLowerCase()));
  const newCandidates = userCandidates.filter(c => !existingAccountUsernames.has(c.username.toLowerCase()));

  // Merge users into accounts for the global search page
  const userAccounts = matchedUsers.map((u) => ({
    _id: accountsRepo.deriveId('website', u.username),
    platform: 'website',
    username: u.username,
    displayName: u.name || u.username,
    score: u.reporterScore || 50,
    avatarUrl: u.photoUrl,
    verified: true,
    bio: u.bio || 'Platform User',
  }));

  const existingAccountsIds = new Set(accounts.map((a) => a._id));
  const newAccounts = userAccounts.filter((ua) => !existingAccountsIds.has(ua._id));

  // Convert existing accounts to candidate format for UI consistency (especially for ReportModal)
  const accountCandidates = accounts.map(a => ({
    platform: a.platform,
    username: a.username,
    displayName: a.displayName,
    sourceUrl: a.sourceUrl || '',
    bio: a.bio || '',
    followers: a.followers || '',
    verified: a.verified || false,
    confidence: 1,
    reason: 'Existing Account Match'
  }));

  // Merge all candidates: Local Accounts + Match Platform Users + Discovered Results
  const allCandidates = [...accountCandidates, ...newCandidates, ...candidates];

  return ok({
    accounts: [...newAccounts, ...accounts],
    candidates: allCandidates,
    sources,
    searchQueries,
    grounded,
    reason
  });
}
