import { fail, ok } from '@/lib/api';
import { assertLimit, getRequestKey, rateLimits } from '@/lib/ratelimit';
import { searchSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import { discoverSocialAccounts } from '@/lib/shoshaDiscovery';

export async function GET(request: Request) {
  const limit = await assertLimit(rateLimits.search, getRequestKey(request));
  if (!limit.allowed) return fail('rate_limited', 'The index needs a minute before another search.', 429);

  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: searchParams.get('q') ?? '' });
  if (!parsed.success) return fail('validation_error', 'Search query is too long.', 422);

  const accounts = await accountsRepo.search(parsed.data.q, 20).catch(() => []);
  const discoverParam = searchParams.get('discover');
  const shouldDiscover = discoverParam !== '0' && discoverParam !== 'false';
  if (!shouldDiscover || parsed.data.q.trim().length < 2) return ok({ accounts, candidates: [], sources: [], searchQueries: [] });

  const discovery = await discoverSocialAccounts(parsed.data.q);
  const existingIds = new Set(accounts.map((account) => `${account.platform}:${account.username.toLowerCase()}`));
  const candidates = discovery.candidates.filter((candidate) => !existingIds.has(`${candidate.platform}:${candidate.username}`));

  return ok({
    accounts,
    candidates,
    sources: discovery.sources,
    searchQueries: discovery.searchQueries,
    grounded: discovery.grounded,
    reason: discovery.reason
  });
}
