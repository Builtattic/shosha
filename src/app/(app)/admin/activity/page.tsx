import * as adminActionsRepo from '@/lib/repos/adminActions';

export const dynamic = 'force-dynamic';

export default async function AdminActivityPage() {
  const actions = await adminActionsRepo.list(300);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Admin Activity</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">{actions.length} actions</span>
      </div>
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-secondary/30"><th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">When</th><th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actor</th><th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</th><th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entity</th></tr></thead>
          <tbody className="divide-y divide-border">{actions.map((a) => <tr key={a._id}><td className="px-5 py-4 text-xs font-mono text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</td><td className="px-5 py-4 font-bold">@{a.actorUsername}</td><td className="px-5 py-4"><span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-black uppercase text-primary">{a.action}</span></td><td className="px-5 py-4 text-xs text-muted-foreground">{a.entityType} {a.entityId}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
