'use client';

import { forwardRef } from 'react';

interface Dimension {
  key: string;
  fullName: string;
  value: number;
  levelLabel: string;
}

interface RecentEvent {
  title?: string;
  description?: string;
  delta?: number;
  impact?: number;
  type?: string;
  eventType?: string;
}

interface ProfileShareCardProps {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  ledgerScore: number;
  credibility: number;
  weeklyDelta: number;
  eventsCount: number;
  dimensions: Dimension[];
  recentEvents: RecentEvent[];
  role?: string;
  location?: string;
  isVerified?: boolean;
}

// ── App light-mode palette ────────────────────────────────────────────────────
const C = {
  bg:       '#ffffff',
  surface:  '#f5f5f5',
  surface2: '#e8e8e8',
  border:   '#e5e5e5',
  text:     '#1a1a1a',
  muted:    '#6b7280',
  dim:      '#9ca3af',
  green:    '#16a34a',
  greenBg:  '#f0fdf4',
  greenBdr: '#bbf7d0',
  red:      '#dc2626',
  redBg:    '#fef2f2',
  amber:    '#d97706',
};
const FONT = "'Instrument Sans','Inter',system-ui,sans-serif";
const MONO = "'DM Mono','IBM Plex Mono',monospace";

// ── Tiny inline sparkline SVG ─────────────────────────────────────────────────
function Spark({ points, color }: { points: string; color: string }) {
  return (
    <svg width="60" height="16" viewBox="0 0 60 16" style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Fixed rising / mixed / flat spark shapes
const SPARK_UP   = '0,14 10,11 20,9 30,6 40,4 50,3 60,1';
const SPARK_DOWN = '0,2 10,5 20,7 30,9 40,11 50,13 60,15';
const SPARK_FLAT = '0,8 10,7 20,8 30,7 40,8 50,7 60,8';

/** Fixed 640×853 (3:4). Rendered to DOM, captured by html2canvas. */
export const ProfileShareCard = forwardRef<HTMLDivElement, ProfileShareCardProps>(
  function ProfileShareCard(
    { displayName, username, avatarUrl, ledgerScore, credibility,
      weeklyDelta, eventsCount, dimensions, recentEvents, role, location, isVerified },
    ref
  ) {
    const isUp   = weeklyDelta > 0;
    const isDown = weeklyDelta < 0;
    const scoreColor  = ledgerScore >= 1000 ? C.green : C.red;
    const deltaColor  = isUp ? C.green : isDown ? C.red : C.muted;
    const trendLabel  = isUp ? '↑ Trending Up' : isDown ? '↓ Declining' : '→ Stable';
    const trendColor  = isUp ? C.green : isDown ? C.red : C.muted;
    const trendBg     = isUp ? C.greenBg : isDown ? C.redBg : C.surface;
    const trendBorder = isUp ? C.greenBdr : isDown ? '#fecaca' : C.border;

    // Momentum bar: 50% = neutral, +delta shifts right
    const momentumPct = Math.min(100, Math.max(4, 50 + (weeklyDelta / 20)));

    // Percentile: proxy from credibility (0-100 → label)
    const percentile  = Math.max(1, Math.min(99, credibility));

    // Credibility ring geometry
    const R     = 38;
    const CIRC  = 2 * Math.PI * R;
    const ringFilled = (credibility / 100) * CIRC;
    const ringColor  = credibility >= 67 ? C.green : credibility >= 33 ? C.amber : C.red;

    // Top 6 dims, top 3 events
    const topDims   = dimensions.slice(0, 6);
    const topEvents = recentEvents.slice(0, 3);

    return (
      <div
        ref={ref}
        style={{
          width: 640, height: 853,
          background: C.bg, color: C.text,
          fontFamily: FONT,
          position: 'relative', overflow: 'hidden',
          border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0,
        }}
      >

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>
            Sho<span style={{ fontWeight: 400, fontStyle: 'italic', color: C.muted }}>शा</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim }}>
              Public Ledger
            </div>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 2, fontFamily: MONO }}>
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* ── IDENTITY ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px', borderBottom: `1px solid ${C.border}` }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined')
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 24, fontWeight: 900, color: C.muted }}>{displayName.slice(0, 1).toUpperCase()}</span>
              }
            </div>
            {isVerified && (
              <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: C.green, border: `2px solid ${C.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 8, fontWeight: 900 }}>✓</span>
              </div>
            )}
          </div>

          {/* Name block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, fontFamily: MONO }}>@{username}</div>
            {(role || location) && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5, display: 'flex', gap: 10 }}>
                {role && <span>{role}</span>}
                {role && location && <span style={{ color: C.border }}>·</span>}
                {location && <span>{location}</span>}
              </div>
            )}
          </div>

          {/* Credibility ring */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={R} fill="none" stroke={C.surface2} strokeWidth="5" />
              <circle cx="50" cy="50" r={R} fill="none"
                stroke={ringColor} strokeWidth="5"
                strokeDasharray={`${ringFilled} ${CIRC - ringFilled}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="46" textAnchor="middle" fontFamily={MONO} fontSize="7" fill={C.dim} letterSpacing="1">CRED</text>
              <text x="50" y="62" textAnchor="middle" fontFamily={FONT} fontSize="20" fontWeight="900" fill={C.text}>{credibility}</text>
              <text x="50" y="73" textAnchor="middle" fontFamily={MONO} fontSize="6" fill={C.dim}>/100</text>
            </svg>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.dim, marginTop: 2 }}>Credibility</div>
          </div>
        </div>

        {/* ── SCORE + TRENDING + MOMENTUM ───────────────────────────── */}
        <div style={{ padding: '18px 28px', borderBottom: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
          {/* Left: number + trend tag + momentum */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, marginBottom: 6 }}>
              Shosha Score
            </div>
            <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.15, color: scoreColor, fontVariantNumeric: 'tabular-nums', display: 'block', paddingBottom: 2 }}>
              {ledgerScore.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: deltaColor, marginTop: 2, fontWeight: 700 }}>
              {isUp ? '↑' : isDown ? '↓' : '→'} {isUp ? '+' : ''}{weeklyDelta} this week
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
              Base 1,000 · Ledger never resets
            </div>

            {/* Trending tag */}
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: trendBg, border: `1px solid ${trendBorder}`, borderRadius: 6, padding: '4px 10px' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: trendColor }}>
                {trendLabel}
              </span>
            </div>

            {/* Momentum bar */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.dim, marginBottom: 5 }}>
                <span>Momentum</span>
                <span style={{ color: trendColor }}>{isUp ? 'Positive' : isDown ? 'Negative' : 'Neutral'}</span>
              </div>
              <div style={{ height: 3, background: C.surface2, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${momentumPct}%`, background: trendColor, borderRadius: 2, maxWidth: '100%' }} />
              </div>
            </div>
          </div>

          {/* Right: trending label — right-aligned */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 4, gap: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: trendBg, border: `1px solid ${trendBorder}`, borderRadius: 6, padding: '6px 12px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: trendColor }}>
                {trendLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ── STATS ROW WITH SPARKLINES ─────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: `1px solid ${C.border}` }}>
          {[
            {
              label: 'This Week',
              value: `${isUp ? '+' : ''}${weeklyDelta}`,
              valueColor: deltaColor,
              sub: 'Score change',
              spark: isUp ? SPARK_UP : isDown ? SPARK_DOWN : SPARK_FLAT,
              sparkColor: deltaColor,
            },
            {
              label: 'Base Score',
              value: '1,000',
              valueColor: C.text,
              sub: 'Starting ledger',
              spark: SPARK_FLAT,
              sparkColor: C.dim,
            },
            {
              label: 'Credibility',
              value: `${credibility}%`,
              valueColor: C.text,
              sub: 'Context score',
              spark: credibility >= 60 ? SPARK_UP : credibility >= 40 ? SPARK_FLAT : SPARK_DOWN,
              sparkColor: ringColor,
            },
            {
              label: 'Events Filed',
              value: String(eventsCount),
              valueColor: C.text,
              sub: 'Documented',
              spark: eventsCount > 0 ? SPARK_UP : SPARK_FLAT,
              sparkColor: C.dim,
            },
          ].map((s, i) => (
            <div key={i} style={{ background: C.bg, padding: '12px 14px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.dim, marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.valueColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: 8, color: C.dim, marginTop: 2, marginBottom: 6 }}>{s.sub}</div>
              <Spark points={s.spark} color={s.sparkColor} />
            </div>
          ))}
        </div>

        {/* ── CONTEXT FACTORS ───────────────────────────────────────── */}
        {topDims.length > 0 && (
          <div style={{ padding: '14px 28px', borderBottom: topEvents.length > 0 ? `1px solid ${C.border}` : 'none', flex: topEvents.length > 0 ? undefined : 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, marginBottom: 10 }}>
              Context Factors · Applied to all events
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
              {dimensions.slice(0, 10).map((d) => {
                const accent = d.value >= 2 ? C.green : d.value >= 1 ? C.text : C.muted;
                return (
                  <div key={d.key} style={{ background: C.surface, borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.dim, marginBottom: 3 }}>
                      {d.fullName}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accent }}>{d.levelLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RECENT EVENTS ─────────────────────────────────────────── */}
        {topEvents.length > 0 && (
          <div style={{ padding: '14px 28px', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, marginBottom: 10 }}>
              Recent Events · Documented
            </div>
            {topEvents.map((ev, i) => {
              const delta   = ev.delta ?? ev.impact ?? 0;
              const type    = ev.eventType ?? ev.type;
              const isPos   = type === 'positive' || delta > 0;
              const isNeg   = type === 'negative' || delta < 0;
              const dColor  = isPos ? C.green : isNeg ? C.red : C.muted;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: i < topEvents.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, flex: 1 }}>
                    {ev.title || ev.description || 'Event'}
                  </div>
                  {delta !== 0 && (
                    <div style={{ fontSize: 14, fontWeight: 900, color: dColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontFamily: MONO }}>
                      {delta > 0 ? '+' : ''}{delta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 28px', borderTop: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: C.text }}>
            Sho<span style={{ fontWeight: 400, fontStyle: 'italic', color: C.muted }}>शा</span>
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>
            shosha.io / @{username}
          </div>
        </div>

      </div>
    );
  }
);
