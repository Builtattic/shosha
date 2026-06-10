import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { createAccount } from '@/api/accounts';

const PLATFORMS = ['twitter', 'instagram', 'linkedin', 'youtube', 'website', 'other'];

export default function AccountNew() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('twitter');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!platform.trim() || !handle.trim()) {
      setError('Platform and handle are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await createAccount({
        platform: platform.trim(),
        handle: handle.trim().replace(/^@/, ''),
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      if (!res.ok || !res.data?.account) {
        throw new Error(res.error || 'Failed to create account');
      }
      navigate(`/accounts/${res.data.account.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold">Create Account</h1>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4 p-4">
        {error ? (
          <p className="rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive">{error}</p>
        ) : null}

        <div className="rounded-xl border border-border p-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full bg-transparent text-[14px] outline-none"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border p-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Handle <span className="text-destructive">*</span>
          </label>
          <input
            required
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="username"
            className="w-full bg-transparent text-[14px] outline-none"
          />
        </div>

        <div className="rounded-xl border border-border p-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Display Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-transparent text-[14px] outline-none"
          />
        </div>

        <div className="rounded-xl border border-border p-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full resize-none bg-transparent text-[14px] outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-foreground py-3 text-[14px] font-bold text-background disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Account'}
        </button>
      </form>
    </main>
  );
}
