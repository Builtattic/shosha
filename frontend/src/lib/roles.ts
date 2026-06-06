import type { UserProfile } from '@/types/user';

/** Roles permitted to access moderation/admin surfaces. Mirrors backend UserRole enum. */
export const ADMIN_ROLES = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const;

export function isAdminRole(role: UserProfile['role']): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
