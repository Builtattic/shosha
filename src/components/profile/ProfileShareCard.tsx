'use client';

import { forwardRef } from 'react';

export interface ProfileShareCardProps {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  ledgerScore: number;
  credibility: number;
  weeklyDelta: number;
  totalImpact: string;
  followers: string;
  role?: string;
  location?: string;
  isVerified?: boolean;
  platform?: string;
  multipliers?: {
    massiveAction?: string;
    people?: string;
    reach?: string;
    impact?: string;
    credibility?: string;
    momentum?: string;
    innovation?: string;
    community?: string;
    resource?: string;
    legacy?: string;
  };
}

const FONT = "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif";

const C = {
  bg:       '#ffffff',
  surface:  '#f7f7f8',
  border:   '#e5e7eb',
  text:     '#111827',
  muted:    '#6b7280',
  dim:      '#9ca3af',
  green:    '#16a34a',
  greenBg:  '#dcfce7',
  red:      '#dc2626',
  accent:   '#1a1a1a',
};

/** Fixed 640×900 card rendered offscreen and captured by html2canvas. */
export const ProfileShareCard = forwardRef<HTMLDivElement, ProfileShareCardProps>(
  function ProfileShareCard(
    {
      displayName, username, avatarUrl, ledgerScore, credibility,
      weeklyDelta, totalImpact, followers, role, location, isVerified,
      platform, multipliers,
    },
    ref
  ) {
    const isUp = weeklyDelta > 0;
    const isDown = weeklyDelta < 0;
    const trendLabel = isUp ? 'Trending Up' : isDown ? 'Declining' : 'Stable';
    const trendIcon = isUp ? '↗' : isDown ? '↘' : '→';
    const scoreColor = ledgerScore >= 1000 ? C.green : C.red;

    // Score gauge ring geometry
    const R = 72;
    const CIRC = 2 * Math.PI * R;
    const scorePercent = Math.min(1, Math.max(0, ledgerScore / 2000));
    const ringFilled = scorePercent * CIRC;

    // Multiplier display data
    const mults = [
      { icon: '⭐', label: 'Massive\nAction', value: multipliers?.massiveAction || 'Standard' },
      { icon: '👥', label: 'People\nMultiplier', value: multipliers?.people || 'Growing' },
      { icon: '🌐', label: 'Reach\nMultiplier', value: multipliers?.reach || 'Local' },
      { icon: '🎯', label: 'Impact\nMultiplier', value: multipliers?.impact || 'Moderate' },
      { icon: '🛡️', label: 'Credibility\nMultiplier', value: multipliers?.credibility || 'Trusted' },
      { icon: '🚀', label: 'Momentum\nMultiplier', value: multipliers?.momentum || 'Rising' },
      { icon: '💡', label: 'Innovation\nMultiplier', value: multipliers?.innovation || 'Creative' },
      { icon: '🤝', label: 'Community\nMultiplier', value: multipliers?.community || 'Active' },
      { icon: '💰', label: 'Resource\nMultiplier', value: multipliers?.resource || 'Resourceful' },
      { icon: '🏛️', label: 'Legacy\nMultiplier', value: multipliers?.legacy || 'Building' },
    ];

    return (
      <div
        ref={ref}
        style={{
          width: 640,
          height: 900,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: FONT,
          color: C.text,
          flexShrink: 0,
        }}
      >
        {/* Rainbow gradient border - outer frame */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 24,
            background: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #ec4899, #ef4444)',
            padding: 4,
          }}
        >
          {/* Inner white card */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 20,
              background: C.bg,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ── HEADER BAR ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px 0 28px' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>
                Sho<span style={{ fontWeight: 400, fontStyle: 'italic', color: C.muted }}>शा</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Real People. Real Impact.</div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>Powered by Sho<span style={{ fontStyle: 'italic' }}>शा</span></div>
              </div>
            </div>

            {/* ── PROFILE + SCORE SECTION ─────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, padding: '22px 28px 16px 28px' }}>
              {/* Left: Avatar + Name */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 190 }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `3px solid ${C.border}`,
                    background: C.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/proxy-image?url=${encodeURIComponent(avatarUrl)}`} alt={displayName} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 42, fontWeight: 900, color: C.dim }}>{displayName[0]?.toUpperCase() ?? '?'}</span>
                  )}
                </div>
                {/* Name + handle */}
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1.2 }}>{displayName}</span>
                    {isVerified && (
                      <span style={{ fontSize: 16, color: C.green }}>✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>@{username.replace(/^@/, '')}</div>
                  {role && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{role}</div>
                  )}
                  {location && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4, fontSize: 11, color: C.muted }}>
                      <span>📍</span> {location}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Score Gauge */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 10 }}>
                  SHOSHA SCORE
                </div>
                {/* Circular gauge */}
                <div style={{ position: 'relative', width: 180, height: 180 }}>
                  <svg width="180" height="180" viewBox="0 0 180 180">
                    {/* Track */}
                    <circle cx="90" cy="90" r={R} fill="none" stroke={C.surface} strokeWidth="10" />
                    {/* Filled arc */}
                    <circle
                      cx="90" cy="90" r={R}
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="10"
                      strokeDasharray={`${ringFilled} ${CIRC - ringFilled}`}
                      strokeLinecap="round"
                      transform="rotate(-90 90 90)"
                      style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                    />
                    {/* Endpoint dot */}
                    <circle
                      cx={90 + R * Math.cos(Math.PI * 2 * scorePercent - Math.PI / 2)}
                      cy={90 + R * Math.sin(Math.PI * 2 * scorePercent - Math.PI / 2)}
                      r="6"
                      fill={C.bg}
                      stroke={C.text}
                      strokeWidth="2"
                    />
                  </svg>
                  {/* Score number centered */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 42, fontWeight: 900, color: C.text, lineHeight: 1 }}>
                      {ledgerScore.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Weekly delta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isUp ? C.green : isDown ? C.red : C.muted }}>
                    {trendIcon} {isUp ? '+' : ''}{weeklyDelta.toLocaleString()} (All Time)
                  </span>
                </div>
                {/* Trend pill */}
                <div
                  style={{
                    marginTop: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isUp ? C.greenBg : C.surface,
                    border: `1px solid ${isUp ? '#bbf7d0' : C.border}`,
                    borderRadius: 20,
                    padding: '5px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: isUp ? C.green : isDown ? C.red : C.muted,
                  }}
                >
                  {trendIcon} {trendLabel}
                </div>
              </div>
            </div>

            {/* ── STATS ROW ──────────────────────────────────────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
                padding: '0 28px 16px 28px',
              }}
            >
              {[
                {
                  icon: isUp ? '↗' : isDown ? '↘' : '→',
                  iconColor: isUp ? C.green : isDown ? C.red : C.muted,
                  value: `${isUp ? '+' : ''}${weeklyDelta.toLocaleString()}`,
                  label: 'This Week',
                },
                {
                  icon: '🔥',
                  iconColor: C.red,
                  value: totalImpact,
                  label: 'Total Impact',
                },
                {
                  icon: '🛡️',
                  iconColor: C.text,
                  value: `${credibility}%`,
                  label: 'Credibility',
                },
                {
                  icon: '👥',
                  iconColor: C.text,
                  value: followers || '—',
                  label: 'Followers',
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: C.surface,
                    borderRadius: 14,
                    padding: '12px 8px',
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{stat.value}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginTop: 2 }}>{stat.label}</span>
                </div>
              ))}
            </div>

            {/* ── 10X MULTIPLIERS ─────────────────────────────────────── */}
            <div style={{ padding: '0 28px 16px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.text, textAlign: 'center', marginBottom: 12 }}>
                10X MULTIPLIERS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {mults.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: '10px 4px 8px',
                    }}
                  >
                    <span style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: C.text, lineHeight: 1.3, whiteSpace: 'pre-line' as const }}>{m.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.green, marginTop: 4 }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FOOTER CTA ─────────────────────────────────────────── */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 28px',
                borderTop: `1px solid ${C.border}`,
                background: C.surface,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>Discover. Measure. Amplify Impact.</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Join thousands of changemakers on Shoशा.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Get your report →</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.text, marginTop: 1 }}>shosha.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
