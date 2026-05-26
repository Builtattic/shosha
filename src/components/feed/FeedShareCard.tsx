'use client';

import React, { forwardRef } from 'react';

/**
 * FeedShareCard
 * VISUAL: kept 1:1 from the gradient-border design.
 * DATA:   wired through your props / helpers / derived values.
 *
 * Media rules:
 *  - Box locked to 16:9, capped by maxHeight so it can't dominate on big cards.
 *  - Off-ratio media is letterboxed (object-fit: contain) over black, never cropped.
 */

/* ----------------------------- Visual brand constants ----------------------------- */
const BRAND = 'Shoशा™';
const LOGO_SRC = '/logo-light.png';
const REPORT_URL = 'https://noshosha.com';
const REPORT_HOST = 'noshosha.com';

/* ----------------------------- Helpers (from your code) ----------------------------- */
function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}
function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}
function platformGlyph(p?: string): string {
  if (p === 'twitter' || p === 'x') return '𝕏';
  if (p === 'instagram') return '◉';
  if (p === 'facebook') return 'f';
  if (p === 'threads') return '@';
  return '🌐';
}
function isSameOrigin(url?: string): boolean {
  if (url?.startsWith('/')) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url!).origin === window.location.origin;
  } catch {
    return false;
  }
}
function proxyUrl(url?: string): string | null {
  if (!url || url === 'null' || url === 'undefined') return null;
  if (isSameOrigin(url)) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

const AVATAR_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#4ade80'];

/* ----------------------------- Palette (kept design) ----------------------------- */
const C = {
  ink: '#0f172a',
  sub: '#64748b',
  faint: '#94a3b8',
  hair: '#eef0f3',
  green: '#16a34a',
  greenBg: '#effaf3',
  greenLine: '#d6f0df',
  red: '#ef4444',
  redBg: '#fdf1f1',
  redLine: '#f8dcdc',
  blue: '#2563eb',
  purple: '#8b5cf6',
};

/* ----------------------------- Logo (image with typed fallback) ----------------------------- */
/* If /logo-light.png fails to load, we render the typed wordmark instead of a
   broken-image icon, so the header always shows something. */
const LogoMark: React.FC = () => {
  const [err, setErr] = React.useState(false);
  if (err) {
    return (
      <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 800, fontSize: 22, color: C.ink, letterSpacing: -0.5 }}>
        {BRAND}
      </span>
    );
  }
  return (
    <img
      src={LOGO_SRC}
      alt={BRAND}
      onError={() => setErr(true)}
      style={{ height: 24, width: 'auto', display: 'block' }}
    />
  );
};

/* ----------------------------- Icons (kept design) ----------------------------- */
const VerifiedBadge: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 2l2.4 1.7 2.9-.3 1.3 2.6 2.6 1.3-.3 2.9L22 12l-1.1 1.5.3 2.9-2.6 1.3-1.3 2.6-2.9-.3L12 22l-2.4-1.7-2.9.3-1.3-2.6-2.6-1.3.3-2.9L2 12l1.1-1.5-.3-2.9 2.6-1.3 1.3-2.6 2.9.3L12 2z"
      fill={C.blue}
    />
    <path d="M8.5 12.2l2.3 2.3 4.7-4.9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowTrend: React.FC<{ up: boolean; color: string; size?: number }> = ({ up, color, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    {up ? (
      <path d="M3 17l6-6 4 4 8-8M21 7v5M21 7h-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M3 7l6 6 4-4 8 8M21 17v-5M21 17h-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const CommentIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M21 12a8 8 0 01-8 8H7l-4 3v-3a8 8 0 010-16h6a8 8 0 018 8z" stroke={C.sub} strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

const ShareIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M16 6l-4-4-4 4M12 2v13" stroke={C.sub} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BookmarkIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" stroke={C.sub} strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

const PinIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" stroke={C.faint} strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.4" stroke={C.faint} strokeWidth="1.7" />
  </svg>
);

const PlayIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M8 5.5v13l11-6.5L8 5.5z" fill={C.ink} />
  </svg>
);

type SidebarIcon = 'trend' | 'impact' | 'credibility' | 'followers';

const SidebarGlyph: React.FC<{ icon: SidebarIcon; color: string }> = ({ icon, color }) => {
  const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' as const, 'aria-hidden': true };
  switch (icon) {
    case 'impact':
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="6" fill={color} />
        </svg>
      );
    case 'credibility':
      return (
        <svg {...base}>
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'followers':
      return (
        <svg {...base}>
          <circle cx="9" cy="9" r="3" stroke={color} strokeWidth="1.8" />
          <path d="M3.5 19a5.5 5.5 0 0111 0M16 7a3 3 0 010 6M21 19a5.5 5.5 0 00-4-5.3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return <ArrowTrend up color={color} size={16} />;
  }
};

/* ----------------------------- Sparkline (kept design) ----------------------------- */
const Sparkline: React.FC<{ points: number[]; color: string; w?: number; h?: number }> = ({
  points,
  color,
  w = 96,
  h = 34,
}) => {
  const gid = React.useId();
  if (!points || points.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 3;
  const coords = points.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / (points.length - 1);
    const y = h - pad - ((p - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1].split(',');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${h - pad} ${coords.join(' ')} ${w - pad},${h - pad}`} fill={`url(#${gid})`} />
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
};

/* ----------------------------- Avatar stack (kept design styling) ----------------------------- */
const AvatarStack: React.FC<{ colors: string[]; ring: string }> = ({ colors, ring }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {colors.slice(0, 4).map((bg, i) => (
      <span
        key={i}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: bg,
          border: `2px solid ${ring}`,
          marginLeft: i === 0 ? 0 : -7,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    ))}
  </div>
);

/* ----------------------------- Reaction box (kept design) ----------------------------- */
const ReactionBox: React.FC<{
  kind: 'align' | 'oppose';
  count: string;
  weeklyChange: string;
  avatarColors: string[];
}> = ({ kind, count, weeklyChange, avatarColors }) => {
  const up = kind === 'align';
  const accent = up ? C.green : C.red;
  const bg = up ? C.greenBg : C.redBg;
  const border = up ? C.greenLine : C.redLine;
  return (
    <div
      style={{
        flex: 1,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '7px 9px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowTrend up={up} color={accent} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: accent }}>
            {up ? 'ALIGNS' : 'OPPOSES'}
          </span>
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{count}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvatarStack colors={avatarColors} ring={bg} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: accent }}>{weeklyChange}</span>
      </div>
    </div>
  );
};

/* ----------------------------- Props (from your code) ----------------------------- */
interface FeedShareCardProps {
  id?: string;
  user?: {
    name?: string;
    handle?: string;
    avatar?: string;
    isVerified?: boolean;
    platform?: string;
    followers?: string;
    accountId?: string;
    [key: string]: unknown;
  };
  timestamp?: string;
  type?: string;
  title?: string;
  description?: string;
  location?: string;
  media?: {
    type?: string;
    url?: string;
    thumbUrl?: string;
    count?: number;
    [key: string]: unknown;
  };
  links?: unknown;
  category?: string;
  deed?: unknown;
  disputeStatus?: unknown;
  reportScore?: number;
  evidenceSourceUrl?: string;
  stats?: {
    aligns?: number;
    opposes?: number;
    comments?: number;
    shares?: number;
    [key: string]: unknown;
  };
  viewer?: unknown;
  reporter?: unknown;
  delta?: number;
  credibility?: number;
}

/* ----------------------------- Component ----------------------------- */
export const FeedShareCard = forwardRef<HTMLDivElement, FeedShareCardProps>(function FeedShareCard(
  { user, timestamp, type, title, location, media, reportScore, stats, delta = 0, credibility },
  ref
) {
  /* ---- derived values (your logic) ---- */
  const pos = type === 'positive';
  const totalImpact = reportScore ?? delta;
  const roundedDelta = Math.round(delta);
  const hasMedia = Boolean(media);
  const hasCredibility = typeof credibility === 'number';

  const avatarSrc = proxyUrl(user?.avatar);
  const avatarCross = avatarSrc && !isSameOrigin(avatarSrc) ? ('anonymous' as const) : undefined;
  const initials = user?.name?.charAt(0).toUpperCase() || '?';
  const avatarBg = AVATAR_COLORS[(user?.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  const isVideoMedia = hasMedia && media?.type === 'video';
  const rawMediaUrl = media?.thumbUrl || media?.url;
  const mediaSrc = rawMediaUrl ? `/api/proxy-image?url=${encodeURIComponent(rawMediaUrl)}` : null;

  /* ---- sidebar values (your data) ---- */
  const sidebar: { value: string; label: string; icon: SidebarIcon; color: string; trend: number[] }[] = [
    {
      value: `${roundedDelta >= 0 ? '+' : ''}${fmt(roundedDelta)}`,
      label: 'This Week',
      icon: 'trend',
      color: C.green,
      trend: [3, 5, 4, 7, 6, 9, 11],
    },
    {
      value: fmt(totalImpact),
      label: 'Total Impact',
      icon: 'impact',
      color: C.red,
      trend: [4, 6, 5, 7, 6, 8, 9],
    },
    {
      value: hasCredibility ? `${Math.round(credibility!)}%` : '—',
      label: 'Credibility',
      icon: 'credibility',
      color: C.ink,
      trend: [5, 6, 5, 7, 8, 7, 9],
    },
    {
      value: user?.followers?.trim() || '—',
      label: 'Followers',
      icon: 'followers',
      color: C.purple,
      trend: [2, 3, 4, 4, 6, 7, 9],
    },
  ];

  const tagTone = pos ? C.green : C.red;
  const tagBg = pos ? C.greenBg : C.redBg;
  const tagLabel = pos ? 'POSITIVE' : 'NEGATIVE';
  const tagPrefix = pos ? '+' : '−';

  const font = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return (
    /* Outer gradient border == boundary of the card, locked to 1:1.
       alignSelf:center + margin:auto + flexShrink:0 stop a flex parent from
       stretching the card into a rectangle (which clips the footer). */
    <div
      ref={ref}
      style={{
        aspectRatio: '1 / 1',
        width: 600,
        maxWidth: '100%',
        margin: '0 auto',
        alignSelf: 'center',
        flexShrink: 0,
        padding: 5,
        borderRadius: 24,
        overflow: 'hidden',
        /* linear (not conic) so it renders in html2canvas / image export too */
        background:
          'linear-gradient(135deg, #facc15, #84cc16, #22d3ee, #3b82f6, #8b5cf6, #ec4899, #f97316)',
        boxSizing: 'border-box',
        fontFamily: font,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#fff',
          borderRadius: 20,
          padding: 10,
          gap: 4,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          color: C.ink,
          overflow: 'hidden',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <LogoMark />
          <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
            <div style={{ fontSize: 9.5, color: C.sub, fontWeight: 600 }}>Social Accountability.</div>
            <div style={{ fontSize: 9, color: C.faint }}>Powered by {BRAND}</div>
          </div>
        </div>

        {/* Body: post (left) + stats sidebar (right) */}
        <div style={{ display: 'flex', gap: 10, marginTop: 6, flex: 1, minHeight: 0 }}>
          {/* Left column */}
          <div style={{ flex: '1 1 0', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: avatarBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 800,
                    overflow: 'hidden',
                  }}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={user?.name}
                      crossOrigin={avatarCross}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                {user?.isVerified && (
                  <span
                    style={{
                      position: 'absolute',
                      right: -2,
                      bottom: -2,
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      background: C.green,
                      border: '2px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{user?.name}</span>
                  {user?.isVerified && <VerifiedBadge size={15} />}
                </div>
                <div style={{ fontSize: 11.5, color: C.sub }}>@{user?.handle}</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>
                  {timestamp} • {platformGlyph(user?.platform)}
                </div>
              </div>
            </div>

            {/* Media — 16:9 box, image FITS (contain) over black, never cropped. */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                background: '#000',
                borderRadius: 10,
                overflow: 'hidden',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mediaSrc && (
                <img
                  src={mediaSrc}
                  alt={title}
                  crossOrigin="anonymous"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              )}

              {(isVideoMedia || !hasMedia) && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    margin: 'auto',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.92)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
                  }}
                >
                  <PlayIcon />
                </span>
              )}

              {hasMedia && (media?.count ?? 0) > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 8,
                    padding: '2px 7px',
                  }}
                >
                  1/{media!.count}
                </span>
              )}
            </div>

            {/* Caption */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                lineHeight: 1.25,
                marginTop: 6,
                minHeight: 35,
                maxHeight: 35,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {title}
            </div>

            {/* Location */}
            {location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 11, color: C.faint }}>
                <PinIcon />
                {location}
              </div>
            )}

            {/* Align / Oppose */}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <ReactionBox
                kind="align"
                count={compact(stats?.aligns ?? 0)}
                weeklyChange={`+${fmt(Math.max(0, roundedDelta))} this week`}
                avatarColors={['#bbf7d0', '#86efac', '#4ade80']}
              />
              <ReactionBox
                kind="oppose"
                count={compact(stats?.opposes ?? 0)}
                weeklyChange={`+${fmt(Math.round((stats?.opposes ?? 0) * 0.08))} this week`}
                avatarColors={['#fecaca', '#fca5a5', '#f87171']}
              />
            </div>

            {/* Interactions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                marginTop: 'auto',
                paddingTop: 6,
                borderTop: `1px solid ${C.hair}`,
                fontSize: 12.5,
                color: C.sub,
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CommentIcon /> {compact(stats?.comments ?? 0)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShareIcon /> {compact(stats?.shares ?? 0)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <BookmarkIcon /> Save
              </span>
            </div>
          </div>

          {/* Right column: tag + stats */}
          <div style={{ flex: '0 0 130px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              style={{
                alignSelf: 'flex-end',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: tagBg,
                color: tagTone,
                border: `1px solid ${tagTone}22`,
                borderRadius: 999,
                padding: '5px 10px',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 0.3,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tagPrefix} {tagLabel}
            </button>

            {sidebar.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <SidebarGlyph icon={s.icon} color={s.color} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{s.value}</span>
                </div>
                <div style={{ fontSize: 9.5, color: C.faint }}>{s.label}</div>
                <Sparkline points={s.trend} color={s.color} w={96} h={22} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginTop: 4,
            paddingTop: 6,
            borderTop: `1px solid ${C.hair}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 8,
                background: C.greenBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SidebarGlyph icon="followers" color={C.green} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.ink }}>Discover. Measure. Amplify Impact.</div>
              <div style={{ fontSize: 10, color: C.faint, lineHeight: 1.3 }}>
                Join thousands of changemakers on {BRAND}.
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.sub, fontWeight: 600 }}>Get your report</div>
            <a
              href={REPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, fontWeight: 700, color: C.green, textDecoration: 'none' }}
            >
              {REPORT_HOST}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FeedShareCard;