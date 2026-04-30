import * as siteSettingsRepo from '@/lib/repos/siteSettings';
import { AdminSettingsForm } from './AdminSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await siteSettingsRepo.get();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Site Settings</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">Feed, scoring, platform controls</span>
      </div>
      <AdminSettingsForm initialSettings={settings} />
    </div>
  );
}
