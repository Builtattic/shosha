import type { ReactNode } from 'react';

// ── Inline bold renderer ───────────────────────────────────────────────────────
// Splits text on **…** markers and returns React nodes.
// Handles the consecutive-bold pattern used in the docs (e.g. ****1****st****)
// by applying the regex globally — each pair of ** is its own match.

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

// ── Main component ─────────────────────────────────────────────────────────────

export function PolicyMarkdown({ content }: { content: string }) {
  // Split on one-or-more blank lines to get individual blocks.
  // Each block is either a bullet item ("- text") or a paragraph.
  const rawBlocks = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Collect rendered elements, grouping consecutive bullet blocks into one <ul>.
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
      // Bullet — strip the leading "- " and queue
      pendingBullets.push(block.slice(2).trim());
    } else {
      flushBullets();

      // Determine visual treatment:
      // A block whose entire text (after stripping **) is bold is treated as a
      // section heading; otherwise it's a regular paragraph.
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
