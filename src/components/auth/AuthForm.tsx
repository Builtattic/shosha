'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const payload = await response.json();
        if (!payload.ok) throw new Error(payload.error.message);
      }

      const result = await signIn('credentials', {
        username: form.username,
        password: form.password,
        redirect: false
      });
      if (result?.error) throw new Error('Credentials did not match the record.');
      toast.push(mode === 'signup' ? 'Identity entered into the archive.' : 'Identity verified.');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'The archive refused the entry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input
        placeholder="username"
        value={form.username}
        onChange={(event) => setForm({ ...form, username: event.target.value })}
        required
      />
      {mode === 'signup' ? (
        <Input
          placeholder="email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
      ) : null}
      <Input
        placeholder="password"
        type="password"
        value={form.password}
        onChange={(event) => setForm({ ...form, password: event.target.value })}
        required
      />
      <Button disabled={loading} className="w-full">
        {loading ? 'Checking record' : mode === 'signup' ? 'Create account' : 'Enter'}
      </Button>
    </form>
  );
}
