export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
