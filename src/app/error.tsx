'use client';

import { Button } from '@/components/ui/Button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="px-4 py-10">
      <p className="text-xs uppercase text-muted">Case file interrupted</p>
      <h1 className="mt-2 font-serif text-5xl">The record blurred.</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        The dossier could not be rendered. Try reopening the file.
      </p>
      <Button className="mt-6" onClick={reset}>
        Reopen file
      </Button>
    </main>
  );
}
