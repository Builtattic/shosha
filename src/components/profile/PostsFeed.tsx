'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PostDetailModal } from '@/components/feed/PostDetailModal';

type Post = {
  externalId?: string;
  content?: string;
  likes?: string;
  replies?: string;
  mediaUrl?: string;
  capturedAt?: string;
};

export function PostsFeed({ posts }: { posts: Post[] }) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!posts.length) {
    return <EmptyState title="No captured posts." body="This dossier has no post evidence in its tray." />;
  }
  return (
    <>
      <div className="space-y-3">
        {posts.map((post, index) => (
          <button
            key={post.externalId ?? index}
            onClick={() => {
              if (post.externalId) {
                setSelectedReportId(post.externalId);
                setModalOpen(true);
              }
            }}
            className="w-full text-left border border-border bg-raised p-4 transition-colors hover:bg-muted/40"
          >
            <p className="text-sm leading-6">{post.content}</p>
            <div className="mt-4 flex gap-4 text-xs uppercase text-dark">
              <span>{post.likes ?? '0'} likes</span>
              <span>{post.replies ?? '0'} replies</span>
            </div>
          </button>
        ))}
      </div>

      <PostDetailModal
        open={modalOpen}
        reportId={selectedReportId}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
