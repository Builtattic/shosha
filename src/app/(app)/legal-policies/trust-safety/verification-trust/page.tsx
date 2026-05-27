import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';
import { PolicyMarkdown } from '@/components/policy/PolicyMarkdown';
import { getPolicyContent } from '@/lib/policyContent';

export default function VerificationTrustPage() {
  const content = getPolicyContent('trust-safety', 'verification-trust');

  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader />

      <div className="mx-auto max-w-2xl px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">

        {/* Back */}
        <Link
          href="/legal-policies"
          className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
          Legal & Policies
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-700">
              Trust & Safety
            </span>
          </div>
          <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
            Verification & Trust Policy
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            How Shosha verifies identities, credentials, and assigns trust signals.
          </p>
        </div>

        {/* Document body */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-sky-700">✦ Document</p>
          </div>
          <div className="px-4 py-6">
            <PolicyMarkdown content={content} />
          </div>
        </div>

      </div>
    </main>
  );
}
