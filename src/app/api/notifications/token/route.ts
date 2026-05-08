import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';

/**
 * FCM Token Registration
 * Receives the Firebase Cloud Messaging token from the client and saves it
 * to the user's node in RTDB to enable push notifications.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Must be signed in to register for notifications.', 401);

  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return fail('bad-request', 'Please provide a valid FCM token.', 400);
    }

    const userRef = adminDb().ref(`users/${user._id}`);

    // Read existing tokens, merge the new one, deduplicate
    const snap = await userRef.child('fcmTokens').once('value');
    const existing: string[] = snap.val() || [];
    if (!existing.includes(token)) {
      await userRef.child('fcmTokens').set([...existing, token]);
    }

    return ok({ message: 'Push notification token registered successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to register notification token';
    return fail('server-error', message, 500);
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Must be signed in to manage notifications.', 401);

  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return fail('bad-request', 'Please provide a valid FCM token.', 400);
    }

    const userRef = adminDb().ref(`users/${user._id}`);
    const snap = await userRef.child('fcmTokens').once('value');
    const existing: string[] = snap.val() || [];
    const updated = existing.filter((t) => t !== token);
    await userRef.child('fcmTokens').set(updated);

    return ok({ message: 'Push notification token removed successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove notification token';
    return fail('server-error', message, 500);
  }
}
