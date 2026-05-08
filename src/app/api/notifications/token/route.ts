import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';

/**
 * FCM Token Registration
 * Receives the Firebase Cloud Messaging token from the client and saves it 
 * to the user's document to enable push notifications.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Must be signed in to register for notifications.', 401);

  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return fail('bad-request', 'Please provide a valid FCM token.', 400);
    }

    // Save token to user doc
    const userRef = adminDb.collection('users').doc(user._id);
    
    // We store tokens in an array in case the user has multiple devices
    await userRef.set({
      fcmTokens: adminDb.FieldValue.arrayUnion(token)
    }, { merge: true });

    return ok({ message: 'Push notification token registered successfully.' });
  } catch (error: any) {
    return fail('server-error', error.message || 'Failed to register notification token', 500);
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

    // Remove token from user doc
    const userRef = adminDb.collection('users').doc(user._id);
    await userRef.set({
      fcmTokens: adminDb.FieldValue.arrayRemove(token)
    }, { merge: true });

    return ok({ message: 'Push notification token removed successfully.' });
  } catch (error: any) {
    return fail('server-error', error.message || 'Failed to remove notification token', 500);
  }
}
