import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

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

    const batch = adminDb.batch();
    const importsRef = adminDb.collection('imports');
    const importedNodes = [];

    // Process in chunks to respect Firestore batch limits (500 operations)
    const MAX_BATCH_SIZE = 400;
    
    for (let i = 0; i < Math.min(contacts.length, MAX_BATCH_SIZE); i++) {
      const c = contacts[i];
      if (!c.name || (!c.phoneNumber && !c.email)) continue;

      const docRef = importsRef.doc();
      const node = {
        _id: docRef.id,
        userId: user._id,
        type: 'phone_contact',
        name: String(c.name).trim(),
        phoneNumber: c.phoneNumber ? String(c.phoneNumber).trim() : null,
        email: c.email ? String(c.email).trim() : null,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      batch.set(docRef, node);
      importedNodes.push(node);
    }

    if (importedNodes.length > 0) {
      await batch.commit();
    }

    return ok({ message: 'Contacts imported successfully.', count: importedNodes.length });
  } catch (error: any) {
    return fail('server-error', error.message || 'Failed to import contacts', 500);
  }
}
