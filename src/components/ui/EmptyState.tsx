export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-border bg-dim p-5">
      <p className="font-serif text-3xl text-text">{title}</p>
      <p className="mt-2 text-sm leading-6 text-dark">{body}</p>
    </div>
  );
}
