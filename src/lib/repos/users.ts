import { adminDb } from '@/lib/firebase/admin';
import { withId, stripId } from '@/lib/repos/_serialize';

export type UserRole = 'user' | 'admin';

export type AppUser = {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  reporterScore: number;
  claimedAccounts: string[];
  createdAt?: string;
  updatedAt?: string;
};

function ref() {
  return adminDb().ref('users');
}

export async function findById(id: string): Promise<AppUser | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<AppUser>(snap.key!, snap.val());
}

export async function upsertFromClerk(input: {
  id: string;
  username: string;
  email: string;
  role?: UserRole;
}): Promise<AppUser> {
  const existing = await findById(input.id);
  const now = new Date().toISOString();
  if (existing) {
    const update: Record<string, unknown> = {
      username: input.username,
      email: input.email,
      updatedAt: now
    };
    if (input.role) update.role = input.role;
    await ref().child(input.id).update(update);
    return (await findById(input.id))!;
  }
  const seed: Omit<AppUser, '_id'> = {
    username: input.username,
    email: input.email,
    role: input.role ?? 'user',
    reporterScore: 50,
    claimedAccounts: [],
    createdAt: now,
    updatedAt: now
  };
  await ref().child(input.id).set(seed);
  return { _id: input.id, ...seed };
}

export async function setReporterScore(id: string, value: number): Promise<void> {
  await ref().child(id).update({ reporterScore: value, updatedAt: new Date().toISOString() });
}

export async function addClaimedAccount(id: string, accountId: string): Promise<void> {
  const user = await findById(id);
  if (!user) return;
  const accounts = user.claimedAccounts ?? [];
  if (!accounts.includes(accountId)) accounts.push(accountId);
  await ref().child(id).update({ claimedAccounts: accounts, updatedAt: new Date().toISOString() });
}

export async function findByUsername(username: string): Promise<AppUser | null> {
  const snap = await ref().orderByChild('username').equalTo(username.toLowerCase()).limitToFirst(1).once('value');
  if (!snap.exists()) return null;
  let result: AppUser | null = null;
  snap.forEach((child) => {
    result = withId<AppUser>(child.key!, child.val());
  });
  return result;
}

export async function listAll(limit = 200): Promise<AppUser[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  const results: AppUser[] = [];
  snap.forEach((child) => {
    results.push(withId<AppUser>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function count(): Promise<number> {
  const snap = await ref().once('value');
  return snap.numChildren();
}

export async function updateRole(id: string, role: UserRole): Promise<AppUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  await ref().child(id).update({ role, updatedAt: new Date().toISOString() });
  return (await findById(id))!;
}

export async function update(id: string, partial: Partial<Omit<AppUser, '_id'>>): Promise<AppUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(patch);
  return (await findById(id))!;
}
