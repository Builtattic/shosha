import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { listAccounts } from '@/api/accounts';
import type { Account } from '@/types/account';
import { AccountCard } from '@/components/accounts/AccountCard';

export default function Accounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listAccounts(50)
      .then((data) => {
        if (mounted) setAccounts(data.items ?? []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background p-4 pb-20">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold">Accounts</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Browse dossiers</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/accounts/new')}
            className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12px] font-bold text-background"
          >
            <Plus size={14} />
            Add Account
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {loading ? (
            <p className="col-span-full py-12 text-center text-muted-foreground">Loading…</p>
          ) : accounts.length === 0 ? (
            <p className="col-span-full py-12 text-center text-muted-foreground">
              No accounts yet.
            </p>
          ) : (
            accounts.map((account) => <AccountCard key={account.id} account={account} />)
          )}
        </div>
      </div>
    </main>
  );
}
