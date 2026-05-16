// src/app/api/og/route.tsx
// Generates a 1200x630 OG image for each profile.
// Served at /api/og?id=elon-musk or /api/og?id=SS00102
// Used by Twitter, WhatsApp, LinkedIn when someone shares a profile link.

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import * as accountsRepo from '@/lib/repos/accounts';

export const runtime = 'nodejs';

const BASE_URL = 'https://www.noshosha.com';

// Score color — mirrors your existing card logic
function scoreColor(score: number) {
  if (score >= 1200) return '#16a34a'; // green
  if (score >= 800)  return '#ca8a04'; // amber
  return '#dc2626';                    // red
}

function scoreTrend(score: number) {
  if (score >= 1200) return { text: 'Strong',    arrow: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> };
  if (score >= 800)  return { text: 'Neutral',   arrow: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> };
  return { text: 'Declining', arrow: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // ── Resolve account (slug or raw ID) ──
  let account = null;

  if (id) {
    // Try slug first, then raw ID
    account = await accountsRepo.findBySlug(id).catch(() => null)
      ?? await accountsRepo.findById(id).catch(() => null);
  }

  // Fallback values if account not found
  const name        = account?.displayName ?? 'Shosha Profile';
  const score       = account?.score ?? 1000;
  const role        = account?.role ?? '';
  const region      = account?.region ?? '';
  const color       = scoreColor(score);
  const trend       = scoreTrend(score);
  const initial     = name[0]?.toUpperCase() ?? 'S';
  const avatarUrl   = account?.avatarUrl;

  // Load font dynamically to bypass Next.js 14 Windows path bug with default fonts
  const interFontData = await fetch(
    'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf'
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: '#0f0f0f',
          fontFamily: "'Inter', system-ui, sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Glow behind score ── */}
        <div
          style={{
            position: 'absolute',
            right: 160,
            top: '50%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            transform: 'translateY(-50%)',
          }}
        />

        {/* ── Top bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '36px 64px 0 64px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Shosha wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.5px',
              }}
            >
              Shosha
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#6b7280',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              · The Ledger
            </div>
          </div>

          {/* noshosha.com */}
          <div style={{ fontSize: 13, color: '#4b5563', letterSpacing: '0.04em' }}>
            noshosha.com
          </div>
        </div>

        {/* ── Main content ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 64px',
            gap: 64,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left: Avatar + name + role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                width={96}
                height={96}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #374151',
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: '#1f2937',
                  border: '2px solid #374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  fontWeight: 900,
                  color: '#9ca3af',
                }}
              >
                {initial}
              </div>
            )}

            {/* Name */}
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.05,
                letterSpacing: '-1px',
              }}
            >
              {name}
            </div>

            {/* Role + region */}
            {(role || region) && (
              <div style={{ fontSize: 20, color: '#6b7280', display: 'flex', gap: 12 }}>
                {[role, region].filter(Boolean).join(' · ')}
              </div>
            )}

            {/* Label */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#4b5563',
                marginTop: 8,
              }}
            >
              Reputation Ledger
            </div>
          </div>

          {/* Right: Score */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            {/* Score label */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Shosha Score
            </div>

            {/* Score ring */}
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: '50%',
                border: `6px solid ${color}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#111827',
                boxShadow: `0 0 40px ${color}33`,
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1,
                  letterSpacing: '-2px',
                }}
              >
                {score.toLocaleString()}
              </div>
            </div>

            {/* Trend pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: `${color}18`,
                border: `1px solid ${color}44`,
                borderRadius: 24,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 700,
                color: color,
              }}
            >
              {trend.arrow}
              {trend.text}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 64px 36px 64px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 13, color: '#374151' }}>
            The system is consistent. Not perfect.
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#4b5563',
              letterSpacing: '0.04em',
            }}
          >
            View full ledger →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: interFontData,
          style: 'normal',
        },
      ],
    }
  );
}