export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-border bg-muted p-5">
      <p className="font-serif text-3xl text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
