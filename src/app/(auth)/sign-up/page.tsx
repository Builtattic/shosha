'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Sign-up is handled on the sign-in page (toggle)
export default function SignUpPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sign-in');
  }, [router]);
  return null;
}
