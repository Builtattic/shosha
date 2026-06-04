/**
 * Returns a DiceBear initials avatar URL for a given name seed.
 */
function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Resolves the best avatar URL to display.
 * If the raw URL is missing/null/'null'/'undefined', falls back to a
 * DiceBear initials placeholder generated from the user's name.
 */
export function resolveAvatarUrl(url: string | null | undefined, name: string): string {
  if (url && url !== 'null' && url !== 'undefined' && url.trim() !== '') {
    return url;
  }
  return dicebearUrl(name || 'U');
}

/**
 * onError handler for avatar <img> elements.
 * Swaps the broken image for a DiceBear initials placeholder.
 */
export function handleAvatarError(
  e: React.SyntheticEvent<HTMLImageElement>,
  name: string,
): void {
  const img = e.currentTarget;
  const fallback = dicebearUrl(name || 'U');
  if (img.src !== fallback) {
    img.src = fallback;
  }
}
