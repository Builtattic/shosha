// lib/rankScope.ts
// Defines the available rank-scope filter options and the URL-param resolver.

export type RankScopeValue = 'global' | 'national' | 'regional' | 'city';

export const RANK_SCOPE_OPTIONS: Array<{ value: RankScopeValue; label: string }> = [
  { value: 'global',   label: 'Global' },
  { value: 'national', label: 'National' },
  { value: 'regional', label: 'Regional' },
  { value: 'city',     label: 'City' },
];

const VALID: RankScopeValue[] = ['global', 'national', 'regional', 'city'];

/** Resolve a raw URL-param string to a valid RankScopeValue; falls back to 'global'. */
export function resolveRankScope(value: string | null): RankScopeValue {
  return VALID.includes(value as RankScopeValue) ? (value as RankScopeValue) : 'global';
}
