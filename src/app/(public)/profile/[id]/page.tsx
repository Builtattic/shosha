import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { idSchema } from '@/lib/validators';
import { profileDescription, profileSlug, profileTitle, siteUrl } from '@/lib/seo';
import { getCachedAccountById, getCachedAccountBySlug } from '@/lib/profileData';

export const revalidate = 3600;
export const dynamicParams = true;

const resolveAccount = cache(async (param: string) => {
  const bySlug = await getCachedAccountBySlug(param);
  if (bySlug) return { account: bySlug, resolvedVia: 'slug' as const };

  const parsed = idSchema.safeParse(param);
  if (!parsed.success) return null;

  const byId = await getCachedAccountById(parsed.data);
  if (!byId) return null;

  return { account: byId, resolvedVia: 'id' as const };
});

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const resolved = await resolveAccount(params.id);
  if (!resolved) return { title: 'Profile Not Found | Shoशा' };

  const { account } = resolved;
  const slug = account.slug ?? profileSlug(account.username || account.displayName);
  const baseUrl = siteUrl();
  const canonicalUrl = `${baseUrl}/${slug}`;
  const title = profileTitle(account);
  const description = profileDescription(account);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
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

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const resolved = await resolveAccount(params.id);
  if (!resolved) notFound();

  const { account, resolvedVia } = resolved;
  const slug = account.slug ?? profileSlug(account.username || account.displayName);
  const baseUrl = siteUrl();

  if (resolvedVia === 'id' && slug && slug !== params.id) {
    redirect(`/${slug}`);
  }

  const score = account.score ?? null;
  const role = account.role ?? account.platform ?? '';
  const region = account.region ?? '';
  const bio = account.bio ?? '';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: account.displayName,
            description: bio,
            url: `${baseUrl}/${slug}`,
            image: account.avatarUrl ?? undefined,
            jobTitle: role || undefined,
            ...(region ? { address: { '@type': 'PostalAddress', addressLocality: region } } : {}),
          }),
        }}
      />

      <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 4 }}>
        {account.displayName}
      </h1>

      {(role || region) && (
        <p style={{ color: '#666', marginBottom: 24 }}>
          {[role, region].filter(Boolean).join(' · ')}
        </p>
      )}

      {score !== null && (
        <section aria-labelledby="score-heading" style={{ marginBottom: 32 }}>
          <h2 id="score-heading" style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            Shosha™ Score
          </h2>
          <p style={{ fontSize: 48, fontWeight: 700 }}>{score}</p>
          <p style={{ color: '#666', fontSize: 14 }}>
            Algorithmically calculated from verified real-world actions, weighted
            by context factors including role, intent, and power held.
          </p>
        </section>
      )}

      {bio && (
        <section aria-labelledby="bio-heading" style={{ marginBottom: 32 }}>
          <h2 id="bio-heading" style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            About
          </h2>
          <p style={{ lineHeight: 1.7, color: '#333' }}>{bio}</p>
        </section>
      )}

      <section aria-labelledby="faq-heading" style={{ marginBottom: 40 }}>
        <h2 id="faq-heading" style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
          Common questions
        </h2>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            What is {account.displayName}&apos;s Shosha score?
          </h3>
          <p style={{ color: '#444', lineHeight: 1.6 }}>
            {score !== null
              ? `${account.displayName}'s current Shosha score is ${score}. Calculated from verified actions weighted against context factors including role, intent, and power held at the time.`
              : `${account.displayName}'s Shosha score has not been calculated yet. Check back soon.`}
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            How is {account.displayName}&apos;s score calculated?
          </h3>
          <p style={{ color: '#444', lineHeight: 1.6 }}>
            Every verified action generates a score delta, weighted against ten
            context factors. A weekly momentum layer means consistent behaviour
            compounds over time. Scores are permanent and cannot be reset.{' '}
            <a href="/how-it-works">Learn how Shosha scores work →</a>
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            Is {account.displayName} on Shosha?
          </h3>
          <p style={{ color: '#444', lineHeight: 1.6 }}>
            Yes. {account.displayName}&apos;s profile is tracked on Shosha
            {region ? ` (${region})` : ''}. View the full ledger and verified
            event history by creating a free account.
          </p>
        </div>
      </section>

      <div
        style={{
          background: '#f5f5f5',
          borderRadius: 8,
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 500, marginBottom: 8 }}>
          See the full ledger for {account.displayName}
        </p>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Sign in to view verified events, score history, impact breakdown, and more.
        </p>
        <a
          href={`/${slug}`}
          style={{
            background: '#000',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Open full profile →
        </a>
      </div>
    </main>
  );
}
