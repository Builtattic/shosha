export function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="animate-pulse border border-border bg-raised p-4">
          <div className="h-4 w-24 bg-dim" />
          <div className="mt-4 h-8 w-40 bg-dim" />
          <div className="mt-4 h-3 w-full bg-dim" />
        </div>
      ))}
    </div>
  );
}
