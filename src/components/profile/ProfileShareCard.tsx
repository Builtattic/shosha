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
  multipliers?: Record<string, string | undefined>;
  oppositions?: number;
  aligns?: number;
  socialRegion?: string;
  socialRole?: string;
  socialReach?: string;
  socialEducation?: string;
  socialSpecializedField?: string;
  socialManagement?: string;
  socialTitle?: string;
  socialLimitations?: string;
  dimensions?: Array<{
    key: string;
    fullName: string;
    value: number;
    levelLabel: string;
    description: string;
  }>;
}

const SANS = "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif";

const C = {
  bg: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  dim: '#9ca3af',
  green: '#4ade80',
  red: '#f43f5e',
  greenDark: '#16a34a',
};

// ── Dynamic bracket system ────────────────────────────────────────────────────
const BRACKETS = [1000, 2000, 5000, 10000, 25000, 50000, 100000, 500000];

function getGaugeBracket(score: number): number {
  const abs = Math.abs(score);
  return BRACKETS.find((b) => b >= abs) ?? BRACKETS[BRACKETS.length - 1];
}

function fmtBracket(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return String(n);
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtFollowers(raw: string): string {
  if (!raw || raw === '—' || raw === '') return '—';
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!isNaN(n) && /^[\d.]+$/.test(raw.trim())) {
    if (n < 1000) return '< 1K';
    return fmtShort(n);
  }
  return raw;
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  toDeg: number,
): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const fx = cx + r * Math.cos(toRad(fromDeg));
  const fy = cy + r * Math.sin(toRad(fromDeg));
  const tx = cx + r * Math.cos(toRad(toDeg));
  const ty = cy + r * Math.sin(toRad(toDeg));
  const span = (((toDeg - fromDeg) % 360) + 360) % 360;
  const la = span > 180 ? 1 : 0;
  return `M ${fx.toFixed(2)} ${fy.toFixed(2)} A ${r} ${r} 0 ${la} 1 ${tx.toFixed(2)} ${ty.toFixed(2)}`;
}

function StatRow({
  iconSvg,
  iconColor,
  value,
  valueColor,
  label,
  sparkUp,
  sparkColor,
}: {
  iconSvg: string;
  iconColor: string;
  value: string;
  valueColor: string;
  label: string;
  sparkUp: boolean;
  sparkColor: string;
}) {
  const sparkPath = sparkUp
    ? 'M0,20 C10,17 22,13 34,10 C46,7 54,4 60,2'
    : 'M0,2 C10,5 22,9 34,12 C46,15 54,18 60,20';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d={iconSvg} />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: valueColor,
            lineHeight: 1,
            fontFamily: SANS,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: SANS }}>
          {label}
        </div>
      </div>
      <svg viewBox="0 0 60 22" width="48" height="18" style={{ flexShrink: 0 }}>
        <path
          d={sparkPath}
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

// SVG icon paths for identifier chips — monochrome line icons
const CHIP_ICONS: Record<string, string> = {
  REGION:       'M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z M12 13a3 3 0 100-6 3 3 0 000 6z',
  ROLE:         'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
  REACH:        'M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01',
  EDUCATION:    'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5',
  'SPEC. FIELD': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  MANAGEMENT:   'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  TITLE:        'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  LIMITATIONS:  'M12 4a1 1 0 110 2 1 1 0 010-2zm-1 4h2v4l2 4h-2l-1-2-1 2H9l2-4V8z M8 20c0-2 2-3 4-3s4 1 4 3',
};

function ChipIcon({ name }: { name: string }) {
  const path = CHIP_ICONS[name] ?? CHIP_ICONS['ROLE'];
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.muted}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ marginBottom: 3, flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}

function IdentifierChip({
  iconKey,
  label,
  value,
}: {
  iconKey: string;
  label: string;
  value?: string;
}) {
  // Truncate long values cleanly
  const display = value
    ? value.length > 18
      ? value.slice(0, 16) + '…'
      : value
    : 'Not specified';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '7px 4px',
        minHeight: 70,
        justifyContent: 'flex-start',
      }}
    >
      <ChipIcon name={iconKey} />
      <span
        style={{
          fontSize: 7,
          fontWeight: 700,
          color: C.dim,
          letterSpacing: '0.07em',
          textTransform: 'uppercase' as const,
          fontFamily: SANS,
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: value ? C.text : C.dim,
          marginTop: 2,
          lineHeight: 1.2,
          fontFamily: SANS,
        }}
      >
        {display}
      </span>
    </div>
  );
}

export const ProfileShareCard = forwardRef<HTMLDivElement, ProfileShareCardProps>(
  function ProfileShareCard(
    {
      displayName,
      username,
      avatarUrl,
      ledgerScore,
      credibility,
      weeklyDelta,
      totalImpact,
      followers,
      role,
      location,
      isVerified,
      oppositions,
      aligns,
      socialRegion,
      socialRole,
      socialReach,
      socialEducation,
      socialSpecializedField,
      socialManagement,
      socialTitle,
      socialLimitations,
      dimensions,
    },
    ref,
  ) {
    const isUp = weeklyDelta > 0;
    const isDown = weeklyDelta < 0;
    const allTimeGain = ledgerScore - 1000;

    // ── Gauge geometry (bracket system) ──────────────────────────────────────
    // Speedometer: starts bottom-left (-135deg), sweeps 270deg to bottom-right (+135deg)
    const gCx = 100;
    const gCy = 105;
    const gR = 74;
    const gaugeStart = 135;
    const gaugeSweep = 270;
    const bracket = getGaugeBracket(ledgerScore);
    const rawPercent = Math.min(1, Math.max(0, (ledgerScore + bracket) / (2 * bracket)));
    const scorePercent = Math.max(rawPercent, 0.02);
    const fillEndDeg = gaugeStart + gaugeSweep * scorePercent;
    const dotX = gCx + gR * Math.cos((fillEndDeg * Math.PI) / 180);
    const dotY = gCy + gR * Math.sin((fillEndDeg * Math.PI) / 180);

    // ── Radar geometry ────────────────────────────────────────────────────────
    const rCx = 90;
    const rCy = 90;
    const rR = 60;
    const rLabelR = 74;
    const N = 8;
    const rAngle = (i: number) => (2 * Math.PI * i) / N - Math.PI / 2;
    const rPt = (t: number, i: number) => ({
      x: rCx + rR * t * Math.cos(rAngle(i)),
      y: rCy + rR * t * Math.sin(rAngle(i)),
    });

    const axisConfig = [
      { lines: ['Reach'],                didx: 1, min: 0.5, max: 3.0, inv: false },
      { lines: ['Education'],            didx: 3, min: 0.5, max: 3.0, inv: false },
      { lines: ['Specialized', 'Field'], didx: 6, min: 0.5, max: 3.0, inv: false },
      { lines: ['Management'],           didx: 2, min: 0.5, max: 3.0, inv: false },
      { lines: ['Title'],                didx: 7, min: 0.5, max: 3.0, inv: true  },
      { lines: ['Limitations'],          didx: 4, min: 0.5, max: 1.0, inv: false },
      { lines: ['Region'],               didx: 0, min: 0.5, max: 1.5, inv: false },
      { lines: ['Role'],                 didx: 5, min: 0.5, max: 3.0, inv: false },
    ];

    const normDim = (v: number, min: number, max: number, inv: boolean) => {
      const n = Math.max(0, Math.min(1, (v - min) / (max - min)));
      return inv ? 1 - n : n;
    };

    const dataPts = axisConfig.map((ax, i) => {
      const dim = dimensions?.[ax.didx];
      const t = dim ? normDim(dim.value, ax.min, ax.max, ax.inv) : 0.45;
      return rPt(Math.max(0.1, t), i);
    });
    const polyPts = dataPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0].map((t) =>
      Array.from({ length: N }, (_, i) => {
        const p = rPt(t, i);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }).join(' '),
    );

    const sectionTitle = (label: string) => (
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: C.muted,
          marginBottom: 8,
          fontFamily: SANS,
          textAlign: 'center' as const,
        }}
      >
        {label}
      </div>
    );

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          boxSizing: 'border-box' as const,
          padding: 3,
          background: 'linear-gradient(135deg, #4ade80 0%, #f43f5e 100%)',
          borderRadius: 19,
          fontFamily: SANS,
        }}
      >
        {/* White card */}
        <div
          style={{
            background: C.bg,
            borderRadius: 16,
            padding: 22,
            display: 'flex',
            flexDirection: 'column' as const,
          }}
        >
          {/* ── ROW 1: HEADER ──────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.png" alt="Shosha" style={{ height: 28, width: 'auto' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: SANS }}>
                Social Accountability.
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: SANS }}>
                Powered by Sho<span style={{ fontStyle: 'italic' }}>शा</span>
              </div>
            </div>
          </div>

          {/* ── ROW 2: IDENTITY + GAUGE + STATS ────────────────────────────── */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            {/* LEFT: Identity */}
            <div
              style={{
                width: 155,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column' as const,
              }}
            >
              {/* Avatar */}
              <div style={{ position: 'relative', width: 76, height: 76, marginBottom: 8 }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `2px solid ${C.border}`,
                    background: C.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/proxy-image?url=${encodeURIComponent(avatarUrl)}`}
                      alt={displayName}
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 26, fontWeight: 900, color: C.dim }}>
                      {displayName[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
                {isVerified && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: C.green,
                      border: '2px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>
                      ✓
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.text,
                  lineHeight: 1.2,
                  fontFamily: SANS,
                }}
              >
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: SANS }}>
                @{username.replace(/^@/, '')}
              </div>
              {role && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: SANS }}>
                  {role}
                </div>
              )}
              {location && (
                <div
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    marginTop: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontFamily: SANS,
                  }}
                >
                  🌍 {location}
                </div>
              )}

              <div style={{ flex: 1 }} />
            </div>

            {/* CENTER: Score Gauge */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  color: C.muted,
                  marginBottom: 2,
                  fontFamily: SANS,
                }}
              >
                SHOSHA SCORE
              </div>

              <svg
                viewBox="0 0 200 200"
                style={{ width: '100%', maxWidth: 200, height: 'auto' }}
                aria-label={`Shosha Score: ${ledgerScore.toLocaleString()}`}
              >
                <defs>
                  <linearGradient
                    id="gaugeGrad"
                    gradientUnits="userSpaceOnUse"
                    x1="26"
                    y1="115"
                    x2="174"
                    y2="115"
                  >
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="30%" stopColor="#fb923c" />
                    <stop offset="60%" stopColor="#d4ff4a" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </linearGradient>
                </defs>

                {/* Track */}
                <path
                  d={arcPath(gCx, gCy, gR, gaugeStart, gaugeStart + gaugeSweep)}
                  fill="none"
                  stroke={C.border}
                  strokeWidth="18"
                  strokeLinecap="round"
                />

                {/* Dim wash — full arc color scale always visible */}
                <path
                  d={arcPath(gCx, gCy, gR, gaugeStart, gaugeStart + gaugeSweep)}
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  opacity="0.25"
                />

                {/* Filled portion */}
                <path
                  d={arcPath(gCx, gCy, gR, gaugeStart, fillEndDeg)}
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />

                {/* Bracket end labels */}
                <text
                  x="20"
                  y="185"
                  textAnchor="middle"
                  fontFamily={SANS}
                  fontSize="9"
                  fill={C.muted}
                >
                  -{fmtBracket(bracket)}
                </text>
                <text
                  x="180"
                  y="185"
                  textAnchor="middle"
                  fontFamily={SANS}
                  fontSize="9"
                  fill={C.muted}
                >
                  +{fmtBracket(bracket)}
                </text>

                {/* Needle dot on arc */}
                <circle
                  cx={dotX.toFixed(2)}
                  cy={dotY.toFixed(2)}
                  r="6"
                  fill="#1c1208"
                />

                {/* Score number */}
                <text
                  x="100"
                  y="112"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily={SANS}
                  fontSize="38"
                  fontWeight="900"
                  fill={C.text}
                >
                  {ledgerScore.toLocaleString()}
                </text>
              </svg>

              {/* Oppose / Align row below gauge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 190, marginTop: 4 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: C.red, fontFamily: SANS, fontWeight: 600 }}>Oppose</div>
                  <div style={{ fontSize: 9, color: C.red, fontFamily: SANS }}>−</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.red, lineHeight: 1, fontFamily: SANS }}>
                    {fmtShort(oppositions ?? 0)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: C.green, fontFamily: SANS, fontWeight: 600 }}>Align</div>
                  <div style={{ fontSize: 9, color: C.green, fontFamily: SANS }}>+</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.green, lineHeight: 1, fontFamily: SANS }}>
                    {fmtShort(aligns ?? 0)}
                  </div>
                </div>
              </div>

              {/* All-time delta */}
              <div
                style={{
                  fontSize: 11,
                  color: C.muted,
                  marginTop: -2,
                  fontFamily: SANS,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ color: isUp ? C.greenDark : isDown ? C.red : C.muted }}>
                  {isUp ? '↗' : isDown ? '↘' : '→'}
                </span>
                {allTimeGain >= 0 ? '+' : ''}
                {allTimeGain.toLocaleString()} (All Time)
              </div>

              {/* Trend badge */}
              <div
                style={{
                  marginTop: 7,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: isUp ? '#f0fdf4' : isDown ? '#fff1f2' : C.surface,
                  border: `1px solid ${isUp ? '#bbf7d0' : isDown ? '#fecdd3' : C.border}`,
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: isUp ? C.greenDark : isDown ? '#dc2626' : C.muted,
                  fontFamily: SANS,
                }}
              >
                {isUp ? '↑' : isDown ? '↓' : '→'} Trending{' '}
                {isUp ? 'Up' : isDown ? 'Down' : 'Stable'}
              </div>
            </div>

            {/* RIGHT: Stats */}
            <div
              style={{
                width: 140,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column' as const,
                justifyContent: 'center',
                gap: 11,
              }}
            >
              <StatRow
                iconSvg="M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6"
                iconColor={isUp ? C.greenDark : isDown ? '#dc2626' : C.muted}
                value={`${isUp ? '+' : ''}${weeklyDelta.toLocaleString()}`}
                valueColor={isUp ? C.greenDark : isDown ? '#dc2626' : C.text}
                label="This Week"
                sparkUp={isUp}
                sparkColor={isUp ? C.green : C.red}
              />
              <StatRow
                iconSvg="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5c-1 2-1.5 3-1.5 5s.5 3 1.5 5c1-2 1.5-3 1.5-5s-.5-3-1.5-5z"
                iconColor="#dc2626"
                value={totalImpact}
                valueColor={C.text}
                label="Total Impact"
                sparkUp
                sparkColor="#f87171"
              />
              <StatRow
                iconSvg="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                iconColor={C.muted}
                value={`${credibility}%`}
                valueColor={C.text}
                label="Credibility"
                sparkUp
                sparkColor="#60a5fa"
              />
              <StatRow
                iconSvg="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75 M9 7a4 4 0 100 8 4 4 0 000-8z"
                iconColor={C.muted}
                value={fmtFollowers(followers)}
                valueColor={C.text}
                label="Followers"
                sparkUp
                sparkColor="#a78bfa"
              />
            </div>
          </div>

          {/* ── ROW 3: SOCIAL IDENTIFIERS (left) + RADAR (right) ───────────── */}
          {/* THIS IS THE KEY FIX: side by side, not stacked */}
          <div
            style={{
              display: 'flex',
              gap: 14,
              marginBottom: 16,
              alignItems: 'flex-start',
            }}
          >
            {/* LEFT: Social Identifiers — 55% */}
            <div style={{ flex: '0 0 55%' }}>
              {sectionTitle('SOCIAL IDENTIFIERS')}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: 5,
                }}
              >
                <IdentifierChip iconKey="REGION" label="REGION" value={socialRegion} />
                <IdentifierChip iconKey="ROLE" label="ROLE" value={socialRole} />
                <IdentifierChip iconKey="REACH" label="REACH" value={socialReach} />
                <IdentifierChip iconKey="EDUCATION" label="EDUCATION" value={socialEducation} />
                <IdentifierChip iconKey="SPEC. FIELD" label="SPEC. FIELD" value={socialSpecializedField} />
                <IdentifierChip iconKey="MANAGEMENT" label="MANAGEMENT" value={socialManagement} />
                <IdentifierChip iconKey="TITLE" label="TITLE" value={socialTitle} />
                <IdentifierChip iconKey="LIMITATIONS" label="LIMITATIONS" value={socialLimitations} />
              </div>
            </div>

            {/* RIGHT: Radar chart — 45% */}
            <div style={{ flex: 1 }}>
              {sectionTitle('SOCIAL IMPACT PROFILE')}
              <svg
                viewBox="-40 -40 260 260"
                width="100%"
                style={{ display: 'block' }}
                aria-label="Social Impact Profile"
              >
                {/* Grid rings */}
                {gridRings.map((pts, li) => (
                  <polygon
                    key={li}
                    points={pts}
                    fill="none"
                    stroke={C.border}
                    strokeWidth={li === 4 ? 1.2 : 0.7}
                  />
                ))}
                {/* Spokes */}
                {axisConfig.map((_, i) => {
                  const ep = rPt(1, i);
                  return (
                    <line
                      key={i}
                      x1={rCx}
                      y1={rCy}
                      x2={ep.x.toFixed(1)}
                      y2={ep.y.toFixed(1)}
                      stroke={C.border}
                      strokeWidth="0.8"
                    />
                  );
                })}
                {/* Data polygon */}
                <polygon
                  points={polyPts}
                  fill={C.green}
                  fillOpacity="0.2"
                  stroke={C.green}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {/* Axis labels */}
                {axisConfig.map((ax, i) => {
                  const ang = rAngle(i);
                  const lx = rCx + rLabelR * Math.cos(ang);
                  const ly = rCy + rLabelR * Math.sin(ang);
                  const cosA = Math.cos(ang);
                  const anchor =
                    Math.abs(cosA) < 0.15 ? 'middle' : cosA > 0 ? 'start' : 'end';
                  const lineH = 9;
                  const offset = (ax.lines.length - 1) * lineH * 0.5;
                  return (
                    <g key={i}>
                      {ax.lines.map((ln, li2) => (
                        <text
                          key={li2}
                          x={lx.toFixed(1)}
                          y={(ly - offset + li2 * lineH).toFixed(1)}
                          textAnchor={anchor}
                          dominantBaseline="middle"
                          fontFamily={SANS}
                          fontSize="7"
                          fill={C.muted}
                        >
                          {ln}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* ── ROW 4: FOOTER ──────────────────────────────────────────────── */}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
              <div>
                <div
                  style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: SANS }}
                >
                  Discover. Measure. Amplify Impact.
                </div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 1, fontFamily: SANS }}>
                  Join thousands of changemakers on Shosha.
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{ fontSize: 11, fontWeight: 500, color: C.greenDark, fontFamily: SANS }}
              >
                Get your report →
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 1, fontFamily: SANS }}>
                noshosha.com
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);