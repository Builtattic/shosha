import Link from 'next/link';
import {
  ShieldCheck,
  Shield,
  TrendingUp,
  Eye,
  FileCheck,
} from 'lucide-react';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-10">
      <span className="text-[12px] font-bold uppercase tracking-[4px] text-muted-foreground whitespace-nowrap">
        {number} — {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

const WHAT_IT_IS = [
  'Identity verified against real credentials',
  'Authentic platform presence confirmed',
  'Reduced impersonation risk',
  'Accountable contributor status',
];

const WHAT_IT_ISNT = [
  'Not a reputation score boost (credibility is separate)',
  'Not an endorsement of your actions',
  'Not absolution for past reports',
  'Not a guarantee of trustworthiness',
];

const BENEFITS = [
  {
    Icon: TrendingUp,
    title: 'Higher Credibility',
    description:
      'Your profile credibility jumps to 100% — the maximum possible.',
  },
  {
    Icon: Eye,
    title: 'More Visibility',
    description:
      'Verified profiles rank higher in discovery, people deck, and search.',
  },
  {
    Icon: FileCheck,
    title: 'Stronger Reports',
    description:
      'Your filings carry higher trust weight in AI and community adjudication.',
  },
  {
    Icon: ShieldCheck,
    title: 'Identity Protection',
    description:
      'Reduces impersonation risk and confirms you own your presence.',
  },
] as const;

const STEPS = [
  {
    number: '01',
    title: 'Submit Verification',
    description:
      "Start the process by clicking Get Verified. You'll enter the verification flow where you can submit your identity documents.",
  },
  {
    number: '02',
    title: 'Complete Payment',
    description:
      'A one-time fee of ₹199 covers the cost of identity review. No subscriptions. No recurring charges.',
  },
  {
    number: '03',
    title: 'Identity Review',
    description:
      'Our team reviews your submission for authenticity. This typically takes 24–48 hours.',
  },
  {
    number: '04',
    title: 'Badge Approval',
    description:
      'Once approved, your Trust Badge is activated immediately and your credibility score is updated across the platform.',
  },
] as const;

export default function TrustBadgePage() {
  return (
    <main className="min-h-screen bg-background safe-bottom">
      <MobileAppHeader />
      <div className="mx-auto max-w-[860px] px-7">
        {/* HERO */}
        <div className="py-20 border-b border-border">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
            <ShieldCheck size={18} className="text-foreground" />
            <span className="text-[13px] font-bold uppercase tracking-[3px] text-muted-foreground">
              Trust Verification
            </span>
          </div>

          <h1 className="font-serif text-[50px] font-normal text-foreground leading-[1.1] mb-5">
            A badge that proves
            <br />
            <em className="text-muted-foreground italic">you are who you say.</em>
          </h1>

          <p className="text-[20px] text-muted-foreground leading-[2] max-w-[600px]">
            The Trust Badge is not a reputation score. It is not an endorsement.
            It confirms only one thing — that your identity has been verified as
            real, authentic, and accountable.
          </p>
        </div>

        {/* 01 — What it means */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="01" label="What the Trust Badge means" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-[24px] border border-border bg-card p-8">
              <ShieldCheck size={32} className="mb-4 text-foreground" />
              <h3 className="font-serif text-[28px] font-normal text-foreground mb-6">
                What it is
              </h3>
              <ul className="space-y-3">
                {WHAT_IT_IS.map((item) => (
                  <li
                    key={item}
                    className="text-[16px] text-foreground leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-border bg-muted p-8">
              <Shield size={32} className="mb-4 text-muted-foreground" />
              <h3 className="font-serif text-[28px] font-normal text-muted-foreground mb-6">
                What it isn&apos;t
              </h3>
              <ul className="space-y-3">
                {WHAT_IT_ISNT.map((item) => (
                  <li
                    key={item}
                    className="text-[16px] text-muted-foreground leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 02 — What you unlock */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="02" label="What you unlock" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map(({ Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[24px] border border-border bg-card p-6 flex flex-col gap-3"
              >
                <Icon size={22} className="text-foreground" />
                <h4 className="text-[15px] font-bold text-foreground">{title}</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[13px] text-muted-foreground mt-4">
            Credibility score increases by up to 20 points upon verification
            approval. Maximum unverified credibility is 80%.
          </p>
        </div>

        {/* 03 — How it works */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="03" label="How it works" />

          <div>
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex gap-6 py-6 border-b border-border last:border-0"
              >
                <span className="font-mono text-[12px] text-muted-foreground shrink-0 pt-1">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-serif text-[24px] font-normal text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-[16px] text-muted-foreground leading-relaxed mt-2">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="py-20 flex flex-col items-center text-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-foreground bg-card">
            <ShieldCheck size={36} className="text-foreground" />
          </div>
          <h2 className="font-serif text-[40px] font-normal text-foreground leading-[1.1]">
            Ready to get verified?
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-[480px]">
            Join verified contributors on Shosha. One-time verification. Permanent
            badge.
          </p>
          <Link
            href="/profile/upgrade"
            className="rounded-full bg-foreground px-10 py-4 text-[15px] font-bold text-background transition hover:opacity-90"
          >
            Get Verified — ₹199
          </Link>
          <p className="text-[12px] text-muted-foreground">
            Already verified?{' '}
            <Link
              href="/profile"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Back to your profile
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
