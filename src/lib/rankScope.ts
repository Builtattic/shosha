export const RANK_SCOPE_VALUES = ['global', 'national', 'local'] as const;
export type RankScopeValue = (typeof RANK_SCOPE_VALUES)[number];

export const RANK_SCOPE_OPTIONS: { value: RankScopeValue; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'national', label: 'National' },
  { value: 'local', label: 'Local' },
];

export function resolveRankScope(param: string | null | undefined): RankScopeValue {
  if (param && RANK_SCOPE_VALUES.includes(param as RankScopeValue)) {
    return param as RankScopeValue;
  }
  return 'global';
}
