'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut } from 'lucide-react';

export function SignInChip() {
  const { data: session } = useSession();
  if (!session) {
    return (
      <Link href="/signin" className="flex min-h-9 items-center gap-2 border border-border px-3 text-xs uppercase text-muted">
        <LogIn size={14} />
        Sign in
      </Link>
    );
  }

  return (
    <button
      className="flex min-h-9 items-center gap-2 border border-border px-3 text-xs uppercase text-muted"
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      <LogOut size={14} />
      {session.user.username}
    </button>
  );
}
