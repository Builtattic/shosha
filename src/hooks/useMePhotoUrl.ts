'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function normalizePhotoUrl(url: string | null | undefined): string | null {
  if (!url || url === 'null' || url === 'undefined') return null;
  return url;
}

export function useMePhotoUrl() {
  const { user } = useAuth();
  const [mePhotoUrl, setMePhotoUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!user) {
      setMePhotoUrl(null);
      return;
    }

    function refreshPhoto() {
      fetch('/api/me', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          const url = data?.data?.user?.photoUrl;
          setMePhotoUrl(normalizePhotoUrl(url));
        })
        .catch(() => {});
    }

    refreshPhoto();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPhoto();
    };
    window.addEventListener('focus', refreshPhoto);
    window.addEventListener('shosha:profile-updated', refreshPhoto);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', refreshPhoto);
      window.removeEventListener('shosha:profile-updated', refreshPhoto);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  const rawPhoto = mePhotoUrl || user?.photoURL;
  const photoUrl = normalizePhotoUrl(rawPhoto ?? null);

  return { photoUrl, imgError, setImgError };
}
