'use client';

import { forwardRef } from 'react';
import { type FeedItemProps } from './FeedItem';

interface FeedShareCardProps extends FeedItemProps {
  // any overrides for the share card
}

const C = {
  bg:       '#ffffff',
  surface:  '#f5f5f5',
  border:   '#e5e5e5',
  text:     '#1a1a1a',
  muted:    '#6b7280',
  dim:      '#9ca3af',
  green:    '#16a34a',
  greenBg:  '#f0fdf4',
  greenBdr: '#bbf7d0',
  red:      '#dc2626',
  redBg:    '#fef2f2',
  redBdr:   '#fecaca',
};
const FONT = "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif";

function compact(value: number) {
  return value > 1000 ? `${(value / 1000).toFixed(1)}K` : value;
}

export const FeedShareCard = forwardRef<HTMLDivElement, FeedShareCardProps>(
  function FeedShareCard(
    {
      id,
      user,
      timestamp,
      type,
      title,
      location,
      media,
      category,
      deed,
      disputeStatus,
      reportScore,
      stats,
      reporter,
      delta
    },
    ref
  ) {
    const isLiveNews = id.startsWith('twitter-') || id.startsWith('ig-') || id.startsWith('fb-') || id.startsWith('news-') || id.startsWith('reddit-');
    const displayAuthor = reporter || (isLiveNews ? user : { name: 'Anonymous', handle: 'anonymous', avatar: '', isVerified: false });
    const displaySubject = isLiveNews ? null : user;
    const isPositive = type === 'positive';

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          background: C.surface, // light grey background around card
          padding: 32,
          fontFamily: FONT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            background: C.bg,
            borderRadius: 24,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── HEADER ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {displayAuthor.avatar && displayAuthor.avatar !== 'null' && displayAuthor.avatar !== 'undefined' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/proxy-image?url=${encodeURIComponent(displayAuthor.avatar)}`} alt={displayAuthor.name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 16, fontWeight: 'bold', color: C.muted }}>{displayAuthor.name[0]}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{displayAuthor.name}</span>
                  {displayAuthor.isVerified && <span style={{ color: C.text }}>✓</span>}
                </div>
                {displaySubject && (
                  <div style={{ fontSize: 13, color: C.muted }}>
                    reported <span style={{ fontWeight: 600, color: C.text }}>{displaySubject.name}</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{timestamp}</div>
              </div>
            </div>

            {/* Type badge */}
            <div
              style={{
                background: isPositive ? C.greenBg : C.redBg,
                color: isPositive ? C.green : C.red,
                border: `1px solid ${isPositive ? C.greenBdr : C.redBdr}`,
                borderRadius: 20,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span style={{ fontSize: 14 }}>{isPositive ? '+' : '−'}</span>
              {type}
            </div>
          </div>

          {/* ── MEDIA ─────────────────────────────────────────────── */}
          {media && (
            <div style={{ margin: '0 20px', borderRadius: 16, overflow: 'hidden', background: C.surface, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {media.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/proxy-image?url=${encodeURIComponent(media.thumbUrl || media.url)}`} alt={title} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 40 }}>▶</span>
                </div>
              )}
            </div>
          )}

          {/* ── BODY ──────────────────────────────────────────────── */}
          <div style={{ padding: '16px 24px' }}>
            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {category && (
                <span style={{ border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: C.muted }}>
                  {category}
                </span>
              )}
              {deed && (
                <span style={{ border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: C.text }}>
                  {deed}
                </span>
              )}
              {reportScore !== undefined && (
                <span style={{ border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: C.text }}>
                  SCORE {reportScore > 0 ? '+' : ''}{Math.round(reportScore)}
                </span>
              )}
            </div>

            {/* Title */}
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{title}</div>
            
            {/* Location */}
            {location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted, marginTop: 8 }}>
                <span>📍</span> {location}
              </div>
            )}
          </div>

          {/* ── VOTING BUTTONS ────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12, padding: '0 24px 20px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px', fontSize: 16, fontWeight: 800, color: C.text }}>
              <span>+</span> {compact(stats.aligns)}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 16, padding: '12px', fontSize: 16, fontWeight: 800, color: C.red }}>
              <span>−</span> {compact(stats.opposes)}
            </div>
          </div>

          {/* ── FOOTER ────────────────────────────────────────────── */}
          <div style={{ borderTop: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', color: C.muted, fontSize: 14 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800 }}>+</span> <span>{compact(stats.aligns)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800 }}>−</span> <span>{compact(stats.opposes)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800 }}>Δ</span> <span>{delta > 0 ? `+${compact(delta)}` : compact(delta)}</span>
              </div>
            </div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 12 }}>
              Sho<span style={{ fontWeight: 400, fontStyle: 'italic', color: C.muted }}>शा</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
