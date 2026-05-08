import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import AccountPage from '../../(app)/account/[id]/page';
import { ReportModalProvider } from '@/components/report/ReportModalProvider';
import { profileDescription, profilePath, profileSlug, profileTitle, siteUrl } from '@/lib/seo';
import { getCachedAccountByUsername } from '@/lib/profileData';

export const dynamic = 'force-dynamic';

type SlugPageProps = {
  params: { slug: string };
  searchParams: { tab?: string };
};

async function accountForSlug(slug: string) {
  const safeSlug = profileSlug(slug);
  if (!safeSlug || safeSlug !== slug.toLowerCase()) return null;
  return getCachedAccountByUsername(safeSlug);
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const account = await accountForSlug(params.slug);
  if (!account) {
    return {
      title: 'Profile not found | Shosha',
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = profilePath(account);
  const canonicalUrl = `${siteUrl()}${canonicalPath}`;
  const title = profileTitle(account);
  const description = profileDescription(account);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'profile',
      images: account.avatarUrl ? [{ url: account.avatarUrl, alt: account.displayName }] : undefined,
    },
    twitter: {
      card: account.avatarUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: account.avatarUrl ? [account.avatarUrl] : undefined,
    },
  };
}

export default async function PublicProfileSlugPage({ params, searchParams }: SlugPageProps) {
  const account = await accountForSlug(params.slug);
  if (!account) notFound();

  const canonicalSlug = profilePath(account).slice(1);
  if (canonicalSlug && params.slug !== canonicalSlug) redirect(`/${canonicalSlug}`);

  return (
    <ReportModalProvider>
      <AccountPage params={{ id: account._id }} searchParams={searchParams} />
    </ReportModalProvider>
  );
}
