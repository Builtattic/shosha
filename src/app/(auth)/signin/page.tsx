import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';

export default function SignInPage() {
  return (
    <main className="px-4 py-10">
      <p className="text-xs uppercase text-accent">Archive access</p>
      <h1 className="mt-3 font-serif text-6xl">Sign in</h1>
      <div className="mt-8">
        <AuthForm mode="signin" />
      </div>
      <Link href="/signup" className="mt-5 block text-sm text-muted">
        Create a new record
      </Link>
    </main>
  );
}
