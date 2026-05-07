export function classifyType(aligns: number, opposes: number): 'positive' | 'negative' {
  return aligns >= opposes ? 'positive' : 'negative';
}
