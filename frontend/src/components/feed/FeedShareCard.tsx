import { forwardRef } from 'react';
import type { FeedItemProps } from '@/types/feed';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedShareCardProps extends FeedItemProps {
  credibility?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT = '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif';

const avatarColors = [
  '#f87171', '#fb923c', '#fbbf24', '#34d399',
  '#60a5fa', '#a78bfa', '#f472b6', '#4ade80',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function platformLabel(platform?: string): string {
  const map: Record<string, string> = {
    twitter: '𝕏', x: '𝕏',
    instagram: 'Instagram', facebook: 'Facebook',
    threads: 'Threads', linkedin: 'LinkedIn',
  };
  return platform ? (map[platform.toLowerCase()] ?? 'Web') : 'Web';
}

function isSameOrigin(url: string): boolean {
  if (url.startsWith('/')) return true;
  try { return new URL(url).origin === window.location.origin; } catch { return false; }
}

function resolveImg(url?: string): string | null {
  if (!url || url === 'null' || url === 'undefined') return null;
  if (isSameOrigin(url)) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

/** Best still-image source from a media object (works for both image & video). */
function resolveMediaStill(media: FeedItemProps['media']): string | null {
  if (!media) return null;
  // For video: thumbUrl is the poster/still; fall back to url only if same-origin
  const preferred = media.thumbUrl || (media.type === 'image' ? media.url : null);
  return preferred ? resolveImg(preferred) : null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function VDivider() {
  return (
    <div style={{ width: 1, background: '#e2e8f0', margin: '0 4px', alignSelf: 'stretch', flexShrink: 0 }} />
  );
}

/** A single stat column: arrow icon + number on one line, label below. */
function StatCol({
  arrow,
  arrowColor,
  value,
  label,
  color,
}: {
  arrow: string;
  arrowColor: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: '0 8px',
    }}>
      {/* Number + arrow on the same baseline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 800,
          color: arrowColor,
          lineHeight: 1,
          fontFamily: FONT,
        }}>
          {arrow}
        </span>
        <span style={{
          fontSize: 18,
          fontWeight: 800,
          color,
          lineHeight: 1,
          fontFamily: FONT,
          letterSpacing: '-0.3px',
        }}>
          {value}
        </span>
      </div>
      {/* Label */}
      <span style={{
        fontSize: 9,
        fontWeight: 600,
        color: '#94a3b8',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: FONT,
        lineHeight: 1,
      }}>
        {label}
      </span>
    </div>
  );
}

/** Chip tag — inline-flex so it vertically centres text correctly. */
function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      verticalAlign: 'middle',
      fontSize: 10,
      fontWeight: 700,
      color,
      background: bg,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      padding: '4px 10px',
      borderRadius: 999,
      lineHeight: 1,
      minHeight: 22,
      height: 22,
      fontFamily: FONT,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
    }}>
      {label}
    </span>
  );
}

// ── FeedShareCard ─────────────────────────────────────────────────────────────

export const FeedShareCard = forwardRef<HTMLDivElement, FeedShareCardProps>(
  function FeedShareCard({
    user,
    timestamp,
    type,
    title,
    location,
    media,
    reportScore,
    stats,
    delta,
    credibility,
    category,
    deed,
  }, ref) {
    const isPositive = type === 'positive';

    // Theme colours
    const accent      = isPositive ? '#16a34a' : '#dc2626';
    const accentLight = isPositive ? '#f0fdf4' : '#fef2f2';
    const accentMid   = isPositive ? '#4ade80' : '#f87171';
    const roundedDelta = Math.round(delta);

    // Avatar resolution
    const avatarSrc  = resolveImg(user.avatar);
    const crossOriginAttr: 'anonymous' | undefined =
      avatarSrc && !isSameOrigin(avatarSrc) ? 'anonymous' : undefined;
    const initials   = (user.name ?? 'U').charAt(0).toUpperCase();
    const avatarBg   = avatarColors[(user.name?.charCodeAt(0) ?? 0) % avatarColors.length];

    // Media still (image or video poster)
    const mediaStill = resolveMediaStill(media);
    const isVideo    = media?.type === 'video';
    const showCred   = typeof credibility === 'number';

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          fontFamily: FONT,
          background: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        }}
      >
        {/* ── Accent stripe ────────────────────────────────────────────── */}
        <div style={{
          height: 5,
          background: `linear-gradient(90deg, ${accent} 0%, ${accentMid} 100%)`,
        }} />

        {/* ── Brand bar ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 22px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>Sho</span>
            <span style={{ fontSize: 20, fontWeight: 400, fontStyle: 'italic', color: '#94a3b8' }}>शा</span>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            verticalAlign: 'middle',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: accent,
            background: accentLight,
            padding: '5px 12px',
            borderRadius: 999,
            lineHeight: 1,
            minHeight: 22,
            height: 22,
            boxSizing: 'border-box',
          }}>
            {isPositive ? '+ Positive' : '− Negative'}
          </span>
        </div>

        {/* ── Media (image or video still) ─────────────────────────────── */}
        {mediaStill ? (
          <div style={{ position: 'relative', overflow: 'hidden', maxHeight: 240, borderBottom: '1px solid #f1f5f9' }}>
            <img
              src={mediaStill}
              alt={title}
              crossOrigin="anonymous"
              style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
            />
            {/* Video indicator overlay */}
            {isVideo && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.28)',
              }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(4px)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#ffffff',
                }}>
                  ▶
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No media — no placeholder gap, just skip cleanly */
          null
        )}

        {/* ── Subject / reporter row ───────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 22px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user.name}
                crossOrigin={crossOriginAttr}
                style={{
                  width: 46, height: 46,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{
                width: 46, height: 46,
                borderRadius: '50%',
                background: avatarBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: '#ffffff',
              }}>
                {initials}
              </div>
            )}
            {user.isVerified && (
              <span style={{
                position: 'absolute', right: 0, bottom: 0,
                width: 12, height: 12,
                borderRadius: '50%',
                background: '#3b82f6',
                border: '2px solid #ffffff',
              }} />
            )}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.25,
            }}>
              {user.name}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
              fontSize: 12,
              fontWeight: 400,
              color: '#64748b',
              lineHeight: 1,
            }}>
              <span>@{user.handle}</span>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span>{timestamp}</span>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span>{platformLabel(user.platform)}</span>
            </div>
          </div>

          {/* Impact score */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{
              fontSize: 26,
              fontWeight: 900,
              color: accent,
              lineHeight: 1,
              letterSpacing: '-1px',
            }}>
              {roundedDelta > 0 ? '+' : ''}{roundedDelta}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: 4,
              lineHeight: 1,
            }}>
              Impact
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
          {/* Chips — inline-flex so text vertically centers */}
          {(category || deed) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}>
              {category && (
                <Chip label={category} color="#64748b" bg="#f1f5f9" />
              )}
              {deed && (
                <Chip label={deed} color={accent} bg={accentLight} />
              )}
            </div>
          )}

          {/* Report title */}
          <p style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 600,
            color: '#0f172a',
            lineHeight: 1.55,
            letterSpacing: '-0.1px',
          }}>
            {title}
          </p>

          {location && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 10,
              fontSize: 11,
              fontWeight: 400,
              color: '#94a3b8',
              lineHeight: 1,
            }}>
              <span>📍</span>
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          padding: '14px 10px',
          borderBottom: '1px solid #f1f5f9',
          background: '#fafbfc',
        }}>
          <StatCol arrow="↑" arrowColor="#16a34a" value={compact(stats.aligns)}   label="Aligns"   color="#0f172a" />
          <VDivider />
          <StatCol arrow="↓" arrowColor="#dc2626" value={compact(stats.opposes)}  label="Opposes"  color="#0f172a" />
          <VDivider />
          <StatCol arrow="💬" arrowColor="#6366f1" value={compact(stats.comments)} label="Comments" color="#0f172a" />
          <VDivider />
          <StatCol arrow="↗" arrowColor="#0ea5e9" value={compact(stats.shares)}   label="Shares"   color="#0f172a" />
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 22px',
          background: '#0f172a',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
              noshosha.com
            </div>
            <div style={{ fontSize: 10, fontWeight: 400, color: '#ffffff', marginTop: 4, lineHeight: 1 }}>
              Social Accountability Platform
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {reportScore !== undefined && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 9, fontWeight: 600, color: '#475569',
                  letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1,
                }}>
                  Report Score
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginTop: 4, lineHeight: 1 }}>
                  {reportScore > 0 ? '+' : ''}{Math.round(reportScore)}
                </div>
              </div>
            )}
            {showCred && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 9, fontWeight: 600, color: '#475569',
                  letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1,
                }}>
                  Credibility
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: accentMid, marginTop: 4, lineHeight: 1 }}>
                  {Math.round(credibility ?? 0)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
