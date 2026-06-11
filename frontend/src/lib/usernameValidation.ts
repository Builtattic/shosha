// Client-side username validation mirroring validate_username_format in
// backend/app/services/_helpers.py exactly (same checks, same order, same
// messages). Used for UX feedback before the backend 422 round-trip.

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]*[a-z0-9]$|^[a-z0-9]$/;
const CONSECUTIVE_SPECIAL = /[._]{2,}/;
const ADJACENT_SPECIAL = /\._|_\./;

export function normalizeUsername(raw: string): string {
  return raw.replace(/^@+/, '').trim().toLowerCase();
}

// Returns an error message, or null if the (already-normalized) username is valid.
export function validateUsernameFormat(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 64) return 'Username must be at most 64 characters';
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and periods';
  }
  if (CONSECUTIVE_SPECIAL.test(username) || ADJACENT_SPECIAL.test(username)) {
    return 'Username cannot have consecutive special characters';
  }
  return null;
}
