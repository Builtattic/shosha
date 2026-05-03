import { EmptyState } from '@/components/ui/EmptyState';

type Post = {
  externalId?: string;
  content?: string;
  likes?: string;
  replies?: string;
  mediaUrl?: string;
  capturedAt?: string;
};

export function PostsFeed({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return <EmptyState title="No captured posts." body="This dossier has no post evidence in its tray." />;
  }
  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <article key={post.externalId ?? index} className="border border-border bg-raised p-4">
          <p className="text-sm leading-6">{post.content}</p>
          <div className="mt-4 flex gap-4 text-xs uppercase text-dark">
            <span>{post.likes ?? '0'} likes</span>
            <span>{post.replies ?? '0'} replies</span>
          </div>
        </article>
      ))}
    </div>
  );
}
