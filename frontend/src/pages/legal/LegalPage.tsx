import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';
import PolicyMarkdown from '@/components/legal/PolicyMarkdown';

const LEGAL_TITLES: Record<string, Record<string, { title: string; subtitle: string; badge: string; badgeClass: string }>> = {
  'trust-safety': {
    'community-guidelines': {
      title: 'Community Guidelines',
      subtitle: 'The standards of conduct expected of everyone on Shosha.',
      badge: 'Trust & Safety',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    'platform-safety-content-integrity': {
      title: 'Platform Safety & Content Integrity Policy',
      subtitle: 'How Shosha maintains safety and content integrity on the platform.',
      badge: 'Trust & Safety',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    'report-appeals-takedown': {
      title: 'Report Appeals & Takedown Policy',
      subtitle: 'How to appeal reports and request content takedowns.',
      badge: 'Trust & Safety',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    'public-figure-profile-claim': {
      title: 'Public Figure & Profile Claim Policy',
      subtitle: 'Rules for claiming public figure profiles on Shosha.',
      badge: 'Trust & Safety',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    'verification-trust': {
      title: 'Verification & Trust Policy',
      subtitle: 'How Shosha verifies identities, credentials, and assigns trust signals.',
      badge: 'Trust & Safety',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    },
  },
  legal: {
    'terms-of-service': {
      title: 'Terms of Service',
      subtitle: 'The agreement between you and Shosha governing use of the platform.',
      badge: 'Legal',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    'privacy-policy': {
      title: 'Privacy Policy',
      subtitle: 'What data Shosha collects, how it is used, and your rights over it.',
      badge: 'Legal',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    'cookie-policy': {
      title: 'Cookie Policy',
      subtitle: 'How Shosha uses cookies and similar technologies.',
      badge: 'Legal',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    'disclaimer-reputation': {
      title: 'Disclaimer & Reputation Policy',
      subtitle: "Shosha's position on liability, reputation scores, and published reports.",
      badge: 'Legal',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    'copyright-ip': {
      title: 'Copyright / IP Policy',
      subtitle: 'Intellectual property rights and copyright on Shosha.',
      badge: 'Legal',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    'platform-positioning': {
      title: 'Shosha Platform Positioning',
      subtitle: 'What Shosha is, what it is not, and how it fits within the broader information ecosystem.',
      badge: 'Legal',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
  },
};

export default function LegalPage() {
  const { section, slug } = useParams<{ section: string; slug: string }>();
  const meta = section && slug ? LEGAL_TITLES[section]?.[slug] : undefined;
  const src = section && slug ? `/legal/${section}/${slug}.md` : '';

  if (!meta || !src) {
    return (
      <main className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">Policy not found.</p>
        <Link to="/legal-policies" className="text-sm underline mt-4 inline-block">
          Back to Legal & Policies
        </Link>
      </main>
    );
  }

  const docBadgeClass =
    section === 'trust-safety'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-violet-200 bg-violet-50 text-violet-700';

  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader />

      <div className="mx-auto max-w-2xl px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <Link
          to="/legal-policies"
          className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
          Legal & Policies
        </Link>

        <div className="mb-6">
          <div className={`mb-2 inline-flex items-center rounded-full border px-3 py-1 ${meta.badgeClass}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {meta.badge}
            </span>
          </div>
          <h1 className="font-serif text-[28px] font-black leading-none tracking-tight text-foreground">
            {meta.title}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{meta.subtitle}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className={`border-b px-4 py-3 ${docBadgeClass.split(' ').slice(0, 2).join(' ')}`}>
            <p className={`text-[11px] font-black uppercase tracking-widest ${docBadgeClass.split(' ')[2]}`}>
              ✦ Document
            </p>
          </div>
          <div className="px-4 py-6">
            <PolicyMarkdown src={src} />
          </div>
        </div>
      </div>
    </main>
  );
}
