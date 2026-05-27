import Link from 'next/link';
import { ChevronRight, ShieldCheck, Scale } from 'lucide-react';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';

// ── Data ──────────────────────────────────────────────────────────────────────

const SUBSECTIONS = [
  {
    id: 'trust-safety',
    label: 'Trust & Safety',
    description: 'How Shosha keeps the platform safe, fair, and accountable.',
    icon: ShieldCheck,
    colorHeader: 'border-sky-200 bg-sky-50',
    colorLabel: 'text-sky-700',
    colorIcon: 'bg-sky-100 text-sky-600',
    colorRow: 'hover:bg-sky-50/60',
    pages: [
      { label: 'Community Guidelines', href: '/legal-policies/trust-safety/community-guidelines' },
      { label: 'Platform Safety & Content Integrity Policy', href: '/legal-policies/trust-safety/platform-safety-content-integrity' },
      { label: 'Report Appeals & Takedown Policy', href: '/legal-policies/trust-safety/report-appeals-takedown' },
      { label: 'Public Figure & Profile Claim Policy', href: '/legal-policies/trust-safety/public-figure-profile-claim' },
      { label: 'Verification & Trust Policy', href: '/legal-policies/trust-safety/verification-trust' },
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    description: 'Terms, privacy, copyright, and platform legal positions.',
    icon: Scale,
    colorHeader: 'border-violet-200 bg-violet-50',
    colorLabel: 'text-violet-700',
    colorIcon: 'bg-violet-100 text-violet-600',
    colorRow: 'hover:bg-violet-50/60',
    pages: [
      { label: 'Terms of Service', href: '/legal-policies/legal/terms-of-service' },
      { label: 'Privacy Policy', href: '/legal-policies/legal/privacy-policy' },
      { label: 'Cookie Policy', href: '/legal-policies/legal/cookie-policy' },
      { label: 'Disclaimer & Reputation Policy', href: '/legal-policies/legal/disclaimer-reputation' },
      { label: 'Copyright / IP Policy', href: '/legal-policies/legal/copyright-ip' },
      { label: 'Shosha Platform Positioning', href: '/legal-policies/legal/platform-positioning' },
    ],
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LegalPoliciesPage() {
  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader />

      <div className="mx-auto max-w-2xl px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
            LEGAL & POLICIES
          </h1>
          <p className="mt-1 text-[13px] font-semibold text-foreground">
            How Shosha works, what we stand for, and what we&apos;re bound by.
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Select a document below to read the full policy.
          </p>
        </div>

        {/* Subsection cards */}
        <div className="space-y-5">
          {SUBSECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {/* Section header */}
                <div className={`flex items-center gap-3 border-b px-4 py-3 ${section.colorHeader}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${section.colorIcon}`}>
                    <Icon size={14} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-black uppercase tracking-widest ${section.colorLabel}`}>
                      ✦ {section.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{section.description}</p>
                  </div>
                </div>

                {/* Page rows */}
                {section.pages.map((page, index) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className={`flex items-center gap-3 border-b border-border/50 px-4 py-3.5 transition-colors last:border-0 ${section.colorRow}`}
                  >
                    <span className="min-w-0 flex-1 text-[13px] font-bold text-foreground">
                      {page.label}
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-muted-foreground/50" />
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
