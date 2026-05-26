export function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="animate-pulse border border-border bg-card p-4">
          <div className="h-4 w-24 bg-muted" />
          <div className="mt-4 h-8 w-40 bg-muted" />
          <div className="mt-4 h-3 w-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
