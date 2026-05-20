'use client';

import { forwardRef } from 'react';
import { type FeedItemProps } from './FeedItem';

interface FeedShareCardProps extends FeedItemProps {
  credibility?: number;
}

const FONT = 'system-ui, -apple-system, sans-serif';
const C = {
  bg: '#ffffff',
  border: '#f0f0f0',
  text: '#111111',
  muted: '#888888',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  greenBdr: '#bbf7d0',
  red: '#dc2626',
  redBg: '#fef2f2',
  redBdr: '#fecaca',
};
const avatarColors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#4ade80'];

function compact(value: number) {
  return value > 1000 ? `${(value / 1000).toFixed(1)}K` : String(value);
}

function fmtShort(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function platformGlyph(platform?: string) {
  if (platform === 'twitter' || platform === 'x') return '𝕏';
  if (platform === 'instagram') return '◉';
  if (platform === 'facebook') return 'f';
  if (platform === 'threads') return '@';
  return '🌐';
}

function isSameOriginUrl(url: string) {
  if (url.startsWith('/')) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

// Resolve an avatar URL for html2canvas: same-origin URLs render directly,
// third-party URLs (dicebear, Firebase, CDNs) are routed through the proxy
// so the capture stays CORS-safe instead of falling back to initials.
function resolveAvatarSrc(url?: string): string | null {
  if (!url || url === 'null' || url === 'undefined') return null;
  if (isSameOriginUrl(url)) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function StatModule({
  icon,
  iconColor,
  value,
  label,
  sparkColor,
  sparkPoints,
  showDivider,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  sparkColor: string;
  sparkPoints: string;
  showDivider?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        borderBottom: showDivider ? '1px solid #f9fafb' : 'none',
        paddingBottom: showDivider ? 5 : 0,
        marginBottom: showDivider ? 1 : 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14, color: iconColor, width: 14, textAlign: 'center' }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, fontFamily: FONT }}>{value}</span>
        </div>
        <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: FONT }}>{label}</div>
      </div>
      <svg width="32" height="14" viewBox="0 0 32 14" style={{ flexShrink: 0 }}>
        <polyline
          points={sparkPoints}
          fill="none"
          stroke={sparkColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export const FeedShareCard = forwardRef<HTMLDivElement, FeedShareCardProps>(
  function FeedShareCard(
    {
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
    },
    ref,
  ) {
    const isPositive = type === 'positive';
    const totalImpactValue = reportScore ?? delta;
    const roundedDelta = Math.round(delta);
    const weekBoost = Math.max(0, roundedDelta);
    const showCredibility = typeof credibility === 'number';
    const showFollowers = Boolean(user.followers && user.followers.trim());
    const avatarSrc = resolveAvatarSrc(user.avatar);
    const avatarCrossOrigin: 'anonymous' | undefined =
      avatarSrc && !isSameOriginUrl(avatarSrc) ? 'anonymous' : undefined;
    const initials = user.name?.charAt(0).toUpperCase() || '?';
    const avatarBg = avatarColors[(user.name?.charCodeAt(0) || 0) % avatarColors.length];
    const rightRailWidth = 168;
    const hasMedia = Boolean(media);
    const titleRow = hasMedia ? 2 : 1;
    const analyticsRow = hasMedia ? 3 : 2;
    const engagementRow = hasMedia ? 4 : 3;
    const footerRow = hasMedia ? 5 : 4;
    const statEndRow = analyticsRow + 1;
    const gridTemplateRows = hasMedia ? '220px auto auto auto auto' : 'auto auto auto auto';

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          padding: 3,
          background: 'linear-gradient(135deg, #4ade80 0%, #f43f5e 100%)',
          borderRadius: 28,
          fontFamily: FONT,
          boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            background: C.bg,
            borderRadius: 25,
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div>
              <div style={{ lineHeight: 1, color: C.text, letterSpacing: -0.5 }}>
                <span style={{ fontSize: 22, fontWeight: 900 }}>Sho</span>
                <span style={{ fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: '#6b7280' }}>शा</span>
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>
                Social Accountability.
                <br />
                Powered by Shoशा
              </div>
            </div>

            <div
              style={{
                background: isPositive ? C.greenBg : C.redBg,
                color: isPositive ? C.green : C.red,
                border: `1px solid ${isPositive ? C.greenBdr : C.redBdr}`,
                borderRadius: 20,
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginTop: 2,
                boxShadow: isPositive ? '0 0 0 3px rgba(22,163,74,0.15)' : '0 0 0 3px rgba(220,38,38,0.15)',
              }}
            >
              {isPositive ? '+ POSITIVE' : '− NEGATIVE'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={user.name}
                  crossOrigin={avatarCrossOrigin}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #f0f0f0',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: avatarBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#ffffff',
                    border: '2px solid #f0f0f0',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
              )}
              {user.isVerified && (
                <span
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    border: '2px solid #ffffff',
                  }}
                />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                @{user.handle} · {timestamp} · {platformGlyph(user.platform)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `1fr ${rightRailWidth}px`,
              gridTemplateRows,
              alignItems: 'stretch',
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {hasMedia && (
              <div style={{ gridColumn: '1', gridRow: '1', position: 'relative', borderRight: `1px solid ${C.border}`, overflow: 'hidden', maxHeight: 220 }}>
                {media!.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(media!.thumbUrl || media!.url)}`}
                    alt={title}
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: 220, background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#ffffff', fontSize: 38 }}>▶</span>
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 60,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
                  }}
                />
                {media!.count && media!.count > 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.5)',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 8,
                    }}
                  >
                    1/{media!.count}
                  </div>
                )}
              </div>
            )}

            <div style={{ gridColumn: '1', gridRow: String(titleRow), borderRight: `1px solid ${C.border}`, padding: '10px 14px 8px', minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: '#0f172a',
                    lineHeight: 1.35,
                    letterSpacing: -0.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 58,
                  }}
                >
                  {title}
                </div>
                {location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                    <span>📍</span>
                    <span>{location}</span>
                  </div>
                )}
              </div>

            <div style={{ gridColumn: '1', gridRow: String(analyticsRow), borderRight: `1px solid ${C.border}`, display: 'flex', gap: 10, padding: '10px 14px', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1.4, display: 'flex', gap: 10, alignItems: 'stretch' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#f0fdf4',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(22,163,74,0.2)',
                        }}
                      >
                        ↗
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{compact(stats.aligns)}</div>
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>ALIGN</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#bbf7d0', border: '1.5px solid white' }} />
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#86efac', border: '1.5px solid white', marginLeft: -4 }} />
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#4ade80', border: '1.5px solid white', marginLeft: -4 }} />
                    </div>
                    <div style={{ fontSize: 8, color: '#16a34a', marginTop: 2 }}>+{weekBoost} this week</div>
                  </div>

                  <div style={{ width: 1, background: '#f0f0f0', alignSelf: 'stretch' }} />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#fef2f2',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
                        }}
                      >
                        ↘
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{compact(stats.opposes)}</div>
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>OPPOSE</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fecaca', border: '1.5px solid white' }} />
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fca5a5', border: '1.5px solid white', marginLeft: -4 }} />
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#f87171', border: '1.5px solid white', marginLeft: -4 }} />
                    </div>
                    <div style={{ fontSize: 8, color: '#dc2626', marginTop: 2 }}>+{weekBoost} this week</div>
                  </div>
                </div>
              </div>

            <div style={{ gridColumn: '1', gridRow: String(engagementRow), borderRight: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>💬 {compact(stats.comments)}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>↗ {compact(stats.shares)}</div>
              </div>

            <div style={{ gridColumn: '1', gridRow: String(footerRow), borderRight: `1px solid ${C.border}`, borderTop: '1px solid #1e293b', background: '#0f172a', padding: '10px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#ffffff' }}>Discover. Measure. Amplify Impact.</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                  Join thousands of changemakers on Shosha.
                </div>
            </div>

            <div style={{ gridColumn: '2', gridRow: `1 / ${statEndRow}`, display: 'flex', flexDirection: 'column', padding: '10px 10px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <StatModule
                    icon="↗"
                    iconColor="#16a34a"
                    value={`${roundedDelta > 0 ? '+' : ''}${roundedDelta}`}
                    label="This Week"
                    sparkColor="#16a34a"
                    sparkPoints="0,10 8,6 16,8 24,4 32,2"
                    showDivider
                  />
                  <StatModule
                    icon="🎯"
                    iconColor="#f59e0b"
                    value={fmtShort(totalImpactValue)}
                    label="Total Impact"
                    sparkColor="#f59e0b"
                    sparkPoints="0,9 8,10 16,7 24,5 32,3"
                    showDivider
                  />
                  <StatModule
                    icon="🛡"
                    iconColor="#3b82f6"
                    value={showCredibility ? `${Math.round(credibility ?? 0)}%` : '—'}
                    label="Credibility"
                    sparkColor="#3b82f6"
                    sparkPoints="0,11 8,9 16,10 24,7 32,6"
                    showDivider
                  />
                  <StatModule
                    icon="👥"
                    iconColor="#8b5cf6"
                    value={showFollowers ? (user.followers ?? '—') : '—'}
                    label="Followers"
                    sparkColor="#8b5cf6"
                    sparkPoints="0,10 8,8 16,6 24,7 32,4"
                  />
                </div>
            </div>

            <div style={{ gridColumn: '2', gridRow: String(engagementRow), padding: '10px 16px', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#111111', background: '#f3f4f6', padding: '4px 12px', borderRadius: 20 }}>Save</span>
            </div>

            <div style={{ gridColumn: '2', gridRow: String(footerRow), borderTop: '1px solid #1e293b', background: '#0f172a', padding: '10px 10px', textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#94a3b8' }}>Get your report →</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#4ade80', marginTop: 2 }}>shosha.com</div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
