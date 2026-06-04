import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves when Firebase has finished restoring persisted auth state. */
export async function getFirebaseIdToken(
  user?: User | null,
  forceRefresh = false,
): Promise<string | null> {
  await auth.authStateReady();
  const resolved = user ?? auth.currentUser;
  if (!resolved) return null;
  return resolved.getIdToken(forceRefresh);
}

export async function getAuthorizationHeader(
  user?: User | null,
  forceRefresh = false,
): Promise<Record<string, string>> {
  const token = await getFirebaseIdToken(user, forceRefresh);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Wait until Firebase issues a non-empty ID token (avoids racing onAuthStateChanged). */
export async function waitForFirebaseIdToken(
  user: User,
  maxAttempts = 8,
): Promise<string> {
  await auth.authStateReady();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = await user.getIdToken(attempt > 0);
    if (token) return token;
    await delay(150 * (attempt + 1));
  }
  throw new Error('Firebase ID token not available');
}
