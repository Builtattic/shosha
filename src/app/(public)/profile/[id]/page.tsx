// src/app/(public)/profile/[id]/page.tsx
// SEO-facing public profile page.
// Accepts both /profile/virat-kohli (slug) and /profile/SS00102 (ID).
// If visited via ID and a slug exists → 301 redirect to slug URL.

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import * as accountsRepo from '@/lib/repos/accounts';
import { idSchema } from '@/lib/validators';

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = 'https://www.noshosha.com';

// ─── Resolve param to account ─────────────────────────────────
// The [id] segment can be either:
//   a) a slug like "virat-kohli"    → search by slug field
//   b) a raw ID like "SS00102"      → search by _id
async function resolveAccount(param: string) {
  // Try slug first — most traffic will come via slug once indexed
  const bySlug = await accountsRepo.findBySlug(param);
  if (bySlug) return { account: bySlug, resolvedVia: 'slug' as const };

  // Fall back to raw ID
  const parsed = idSchema.safeParse(param);
  if (!parsed.success) return null;

  const byId = await accountsRepo.findById(parsed.data);
  if (!byId) return null;

  return { account: byId, resolvedVia: 'id' as const };
}

// ─── generateMetadata ─────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const resolved = await resolveAccount(params.id);
  if (!resolved) return { title: 'Profile Not Found | Shosha' };

  const { account } = resolved;
  const slug = (account as any).slug ?? account._id;

  const title = `${account.displayName} — Shosha Score: ${account.score ?? '—'}`;
  const description = `${account.displayName}'s public reputation ledger on Shosha. Score: ${account.score ?? 'unscored'}. Every verified action, context-weighted and permanently recorded.${account.role ? ' ' + account.role + '.' : ''}${account.region ? ' ' + account.region + '.' : ''}`.trim();

  return {
    title,
    description,
    // Canonical always points to the slug URL — critical for SEO
    // Prevents Google from indexing both /SS00102 and /virat-kohli as separate pages
    alternates: {
      canonical: `${BASE_URL}/profile/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/profile/${slug}`,
      type: 'profile',
      images: [`${BASE_URL}/api/og?id=${account._id}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${BASE_URL}/api/og?id=${account._id}`],
    },
  };
}

// ─── PAGE ─────────────────────────────────────────────────────
export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const resolved = await resolveAccount(params.id);
  if (!resolved) notFound();

  const { account, resolvedVia } = resolved;
  const slug = (account as any).slug;

  // ── 301 redirect: if visited via raw ID and slug exists ──
  // e.g. /profile/SS00102 → /profile/virat-kohli
  if (resolvedVia === 'id' && slug && slug !== params.id) {
    redirect(`/profile/${slug}`);
  }

  const score = account.score ?? null;
  const role = account.role ?? account.platform ?? '';
  const region = account.region ?? '';
  const bio = account.bio ?? '';
  const canonicalSlug = slug ?? account._id;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

      {/* ── JSON-LD: Person schema ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: account.displayName,
            description: bio,
            url: `${BASE_URL}/profile/${canonicalSlug}`,
            image: account.avatarUrl ?? undefined,
            jobTitle: role || undefined,
            ...(region ? { address: { '@type': 'PostalAddress', addressLocality: region } } : {}),
          }),
        }}
      />

      {/* ── H1 ── */}
      <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 4 }}>
        {account.displayName}
      </h1>

      {(role || region) && (
        <p style={{ color: '#666', marginBottom: 24 }}>
          {[role, region].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* ── Score ── */}
      {score !== null && (
        <section aria-labelledby="score-heading" style={{ marginBottom: 32 }}>
          <h2 id="score-heading" style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            Shosha Score
          </h2>
          <p style={{ fontSize: 48, fontWeight: 700 }}>{score}</p>
          <p style={{ color: '#666', fontSize: 14 }}>
            Algorithmically calculated from verified real-world actions, weighted
            by context factors including role, intent, and power held.
          </p>
        </section>
      )}

      {/* ── Bio ── */}
      {bio && (
        <section aria-labelledby="bio-heading" style={{ marginBottom: 32 }}>
          <h2 id="bio-heading" style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            About
          </h2>
          <p style={{ lineHeight: 1.7, color: '#333' }}>{bio}</p>
        </section>
      )}

      {/* ── FAQ block — featured snippet targets ── */}
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

      {/* ── CTA ── */}
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
          href={`/account/${account._id}`}
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