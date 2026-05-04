import { headers, cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase/admin';
import * as usersRepo from '@/lib/repos/users';
import type { AppUser } from '@/lib/repos/users';

// Re-export init to ensure admin app is initialized
import '@/lib/firebase/admin';

async function getAdminAuth() {
  // Import adminDb to ensure the app is initialized before calling getAuth
  adminDb();
  return getAuth();
}

/**
 * Extract the Firebase ID token from the request.
 * Supports: Authorization: Bearer <token> OR __session cookie.
 */
async function getTokenFromRequest(): Promise<string | null> {
  const headerStore = await headers();
  const authHeader = headerStore.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookieStore = await cookies();
  return cookieStore.get('__session')?.value ?? null;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = await getTokenFromRequest();
  if (!token) return null;

  try {
    const adminAuth = await getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const emailVerified = Boolean((decoded as { email_verified?: boolean }).email_verified);

    // Try to find existing user in RTDB
    try {
      const existing = await usersRepo.findById(uid);
      if (existing) {
        // Backfill ledger fields for users created before the new scoring system.
        // Idempotent — only writes when score / scoreHistory are missing.
        if (typeof existing.score !== 'number' || !Array.isArray(existing.scoreHistory)) {
          const seeded = await usersRepo.ensureLedger(uid).catch(() => null);
          if (seeded) return { ...seeded, emailVerified };
        }
        return { ...existing, emailVerified };
      }

      // First login — create user from Firebase Auth claims
      const rawUsername = decoded.email?.split('@')[0]?.toLowerCase() ?? decoded.name?.toLowerCase() ?? 'user';
      // Replace dots and other characters invalid in Firebase keys with hyphens
      const safeUsername = rawUsername.replace(/[.#$[\]]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'user';
      const created = await usersRepo.upsertFromClerk({
        id: uid,
        username: safeUsername,
        email: decoded.email ?? '',
        role: 'user'
      });
      return { ...created, emailVerified };
    } catch (dbErr) {
      // RTDB unavailable — return lightweight user from token
      console.warn('[auth] RTDB unavailable, using token-only user:', (dbErr as Error).message);
      return {
        _id: uid,
        username: decoded.email?.split('@')[0]?.toLowerCase() ?? 'user',
        email: decoded.email ?? '',
        role: 'user',
        reporterScore: 50,
        claimedAccounts: [],
        emailVerified
      };
    }
  } catch (err) {
    // Invalid token or verification failed
    console.warn('[auth] Token verification failed:', (err as Error).message);
    return null;
  }
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    const error = new Error('unauthorized');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return user;
}

export function isAdmin(user: AppUser | null): boolean {
  return Boolean(user && ['moderator', 'editor', 'admin', 'super_admin'].includes(user.role));
}

/**
 * A user passes the email-verification gate when:
 *  - They have no email (e.g. phone-OTP signup), OR
 *  - Their email is verified (Google guarantees true; email/password requires the verification email link).
 */
export function isEmailVerified(user: AppUser | null): boolean {
  if (!user) return false;
  if (!user.email) return true;
  return Boolean(user.emailVerified);
}

export function isSuperAdmin(user: AppUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!isAdmin(user)) {
    const error = new Error('forbidden');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  return user;
}
