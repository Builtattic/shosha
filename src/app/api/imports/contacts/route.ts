import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Third-Party Imports: Backend service for importing phone contacts.
 * Securely stages contact info for processing and network discovery.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Must be signed in to import contacts.', 401);

  try {
    const { contacts } = await request.json();
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return fail('bad-request', 'Please provide an array of valid contacts.', 400);
    }

    const importsRef = adminDb().ref('imports');
    let count = 0;

    // Process up to 400 contacts at once
    for (const c of contacts.slice(0, 400)) {
      if (!c.name || (!c.phoneNumber && !c.email)) continue;

      const node = {
        userId: user._id,
        type: 'phone_contact',
        name: String(c.name).trim(),
        phoneNumber: c.phoneNumber ? String(c.phoneNumber).trim() : null,
        email: c.email ? String(c.email).trim() : null,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await importsRef.push().set(node);
      count++;
    }

    return ok({ message: 'Contacts imported successfully.', count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import contacts';
    return fail('server-error', message, 500);
  }
}
