import { fail, ok } from '@/lib/api';
import { idSchema } from '@/lib/validators';
import * as interactionsRepo from '@/lib/repos/reportInteractions';
import * as usersRepo from '@/lib/repos/users';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No filing exists for that id.', 404);

  const comments = await interactionsRepo.listComments(id.data, 100);
  if (comments.length === 0) return ok([]);

  const userIds = Array.from(new Set(comments.map((c) => c.userId).filter(Boolean)));
  const users = await Promise.all(userIds.map((uid) => usersRepo.findById(uid)));
  const userMap = new Map(users.filter((u): u is NonNullable<typeof u> => Boolean(u)).map((u) => [u._id, u]));

  return ok(
    comments.map((c) => {
      const author = userMap.get(c.userId);
      return {
        id: c._id,
        text: c.text,
        createdAt: c.createdAt,
        author: author
          ? {
              id: author._id,
              name: author.name ?? author.username ?? 'Anonymous',
              username: author.username,
              avatar: author.photoUrl ?? ''
            }
          : { id: c.userId, name: 'Unknown', username: '', avatar: '' }
      };
    })
  );
}
