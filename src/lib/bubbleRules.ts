export function approvalThreshold(memberCount: number) {
  return Math.max(1, Math.floor(memberCount / 2) + 1);
}
