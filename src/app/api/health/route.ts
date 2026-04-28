import { ok } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    await adminDb().ref('health/ping').set({ ts: Date.now() });
    return ok({ status: 'steady' });
  } catch {
    return ok({ status: 'database_offline' }, 200);
  }
}
