import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Third-Party Imports: Backend service for importing group links (WhatsApp/Telegram/Discord)
 * Accepts a list of group links, infers platform, and stages them for Shosha processing.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Must be signed in to import links.', 401);

  try {
    const { links } = await request.json();
    if (!Array.isArray(links) || links.length === 0) {
      return fail('bad-request', 'Please provide an array of valid group links.', 400);
    }

    const batch = adminDb.batch();
    const importsRef = adminDb.collection('imports');
    const importedNodes = [];

    for (const url of links) {
      if (typeof url !== 'string') continue;

      let platform = 'unknown';
      if (url.includes('chat.whatsapp.com') || url.includes('wa.me')) platform = 'whatsapp';
      else if (url.includes('t.me')) platform = 'telegram';
      else if (url.includes('discord.gg') || url.includes('discord.com')) platform = 'discord';
      else if (url.includes('facebook.com/groups')) platform = 'facebook';

      const docRef = importsRef.doc();
      const node = {
        _id: docRef.id,
        userId: user._id,
        type: 'group_link',
        platform,
        url,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      batch.set(docRef, node);
      importedNodes.push(node);
    }

    await batch.commit();

    return ok({ message: 'Links imported successfully.', count: importedNodes.length, importedNodes });
  } catch (error: any) {
    return fail('server-error', error.message || 'Failed to import links', 500);
  }
}
