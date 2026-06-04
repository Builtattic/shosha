const AUTH_MESSAGES: Record<string, string> = {
  'auth/unauthorized-domain':
    'This site is not authorized for sign-in. In Firebase Console → Authentication → Settings → Authorized domains, add localhost and 127.0.0.1.',
  'auth/operation-not-allowed':
    'This sign-in method is disabled. Enable Google (or Email) under Firebase Console → Authentication → Sign-in method.',
  'auth/popup-blocked':
    'The sign-in popup was blocked. Allow popups for this site and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/network-request-failed':
    'Network error while contacting Firebase. Check your connection and try again.',
  'auth/invalid-api-key': 'Invalid Firebase API key. Check VITE_FIREBASE_* values in .env.local.',
};

/**
 * Turns Firebase / API errors into user-facing copy.
 * Avoids the old regex that stripped "(auth/...)" and left a useless "Error." string.
 */
export function formatAuthError(err: unknown, fallback = 'Something went wrong.'): string {
  if (!err) return fallback;

  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: string; message?: string };
    if (e.code && AUTH_MESSAGES[e.code]) return AUTH_MESSAGES[e.code];
    if (e.message && typeof e.message === 'string' && e.message.trim()) {
      const trimmed = e.message.replace(/^Firebase:\s*/i, '').trim();
      if (trimmed && trimmed !== 'Error' && trimmed !== 'Error.') {
        return trimmed;
      }
    }
    if (e.code) return AUTH_MESSAGES[e.code] ?? e.code;
  }

  if (err instanceof Error && err.message.trim()) {
    return formatAuthError({ message: err.message }, fallback);
  }

  return fallback;
}
