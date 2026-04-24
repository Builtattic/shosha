import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';

export default function SignUpPage() {
  return (
    <main className="px-4 py-10">
      <p className="text-xs uppercase text-accent">New identity</p>
      <h1 className="mt-3 font-serif text-6xl">Sign up</h1>
      <div className="mt-8">
        <AuthForm mode="signup" />
      </div>
      <Link href="/signin" className="mt-5 block text-sm text-muted">
        Return to sign in
      </Link>
    </main>
  );
}
