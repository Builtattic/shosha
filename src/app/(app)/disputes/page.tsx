'use client';

import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DisputesPage() {
  return (
    <main className="min-h-screen bg-background pb-24 pt-8 px-4 lg:px-12 flex flex-col items-center justify-center text-center">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
        <ShieldAlert size={40} />
      </div>

      <h1 className="text-[32px] font-serif font-black text-foreground mb-4">
        Dispute Center
      </h1>

      <p className="text-[15px] text-muted-foreground max-w-md mx-auto mb-8">
        Our dispute system allows verified profiles to challenge the factual accuracy of an event. Appeals require documented evidence.
      </p>

      <div className="rounded-[24px] border border-border bg-card p-6 max-w-md w-full mb-8">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0 mt-1">
            <AlertTriangle size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-[14px]">You have no active disputes.</h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              If a reported event contains factually incorrect information, you can initiate a dispute from your profile dashboard.
            </p>
          </div>
        </div>
      </div>

      <Button size="lg" disabled>
        File a Dispute (Premium)
      </Button>
    </main>
  );
}
