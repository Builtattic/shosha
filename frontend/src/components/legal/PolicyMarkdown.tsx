import { useEffect, useState, type ReactNode } from 'react';

function InlineContent({ text }: { text: string }): ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-foreground">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function PolicyMarkdownBody({ content }: { content: string }) {
  const rawBlocks = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const elements: ReactNode[] = [];
  const pendingBullets: string[] = [];

  function flushBullets() {
    if (pendingBullets.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-0 list-none">
        {pendingBullets.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground"
          >
            <span className="mt-[5px] shrink-0 text-[7px] text-muted-foreground/40">●</span>
            <span>
              <InlineContent text={item} />
            </span>
          </li>
        ))}
      </ul>,
    );
    pendingBullets.length = 0;
  }

  for (const block of rawBlocks) {
    if (block.startsWith('- ')) {
      pendingBullets.push(block.slice(2).trim());
    } else {
      flushBullets();

      const strippedOfBold = block.replace(/\*\*(.*?)\*\*/g, '$1').trim();
      const isFullyBold =
        block.replace(/\*\*/g, '').trim() === strippedOfBold &&
        block.startsWith('**') &&
        block.endsWith('**');

      if (isFullyBold) {
        elements.push(
          <p
            key={`h-${elements.length}`}
            className="mt-5 mb-1.5 text-[13px] font-black leading-snug text-foreground first:mt-0"
          >
            <InlineContent text={block} />
          </p>,
        );
      } else {
        elements.push(
          <p
            key={`p-${elements.length}`}
            className="mb-3 text-[13px] leading-relaxed text-muted-foreground"
          >
            <InlineContent text={block} />
          </p>,
        );
      }
    }
  }

  flushBullets();

  return <div>{elements}</div>;
}

interface PolicyMarkdownProps {
  src: string;
}

export default function PolicyMarkdown({ src }: PolicyMarkdownProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [src]);

  if (loading) return <div className="animate-pulse h-96 bg-muted rounded" />;
  if (error) return <div className="text-destructive">Content not found.</div>;

  return <PolicyMarkdownBody content={content} />;
}
