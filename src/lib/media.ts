/**
 * Centralized media helpers for avatars, thumbnails and image fallbacks.
 */

/**
 * Generate a DiceBear initials avatar URL for use as a fallback
 * when a user/account has no uploaded photo or the photo fails to load.
 */
export function avatarFallbackUrl(name: string): string {
  const seed = encodeURIComponent(name || 'User');
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=1a1a1a&textColor=ffffff`;
}

/**
 * Resolve the best avatar URL for display.
 * Returns the uploaded URL if valid, otherwise a DiceBear fallback.
 */
export function resolveAvatarUrl(
  url: string | null | undefined,
  displayName: string
): string {
  if (url && url !== 'null' && url !== 'undefined' && url.trim()) {
    return url;
  }
  return avatarFallbackUrl(displayName);
}

/**
 * Handle `onError` for an <img> element by swapping its `src` to a
 * DiceBear fallback so the UI never shows a broken image icon.
 */
export function handleAvatarError(
  event: React.SyntheticEvent<HTMLImageElement>,
  displayName: string
): void {
  const img = event.target as HTMLImageElement;
  const fallback = avatarFallbackUrl(displayName);
  // Prevent infinite loop if the fallback itself fails
  if (img.src === fallback) return;
  img.src = fallback;
}

/**
 * Construct a permanent public Firebase Storage URL from a file path.
 * Matches the URL pattern produced by the upload API.
 */
export function firebaseStorageUrl(bucketName: string, filePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;
}
