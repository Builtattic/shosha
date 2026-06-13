const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export function setOgImage(accountId: string) {
  const content = `${API_BASE}/og?id=${accountId}`;
  let tag = document.querySelector('meta[property="og:image"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', 'og:image');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function clearOgImage() {
  document.querySelector('meta[property="og:image"]')?.remove();
}
