'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface DataPoint {
  date: Date;
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  rangeMode?: 'weekly' | 'monthly' | 'max';
}

/* ─── helpers ─── */

function formatTick(d: Date, mode: string, span: number): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (mode === 'weekly')  return days[d.getDay()];
  if (mode === 'monthly') return months[d.getMonth()];
  if (span <= 14)  return `${d.getDate()} ${months[d.getMonth()]}`;
  if (span <= 180) return `${d.getDate()} ${months[d.getMonth()]}`;
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function niceSteps(min: number, max: number, count: number): number[] {
  const range = max - min || 1;
  const rough = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  let step: number;
  if (residual <= 1.5) step = 1 * mag;
  else if (residual <= 3) step = 2 * mag;
  else if (residual <= 7) step = 5 * mag;
  else step = 10 * mag;

  const start = Math.floor(min / step) * step;
  const result: number[] = [];
  for (let v = start; v <= max + step * 0.01; v += step) {
    result.push(Math.round(v * 1e6) / 1e6);
  }
  return result;
}

function fmtY(v: number): string {
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(0)}k`;
  if (Math.abs(v) >= 1000)  return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ─── component ─── */

export function D3AreaChart({ data, height = 280, rangeMode = 'max' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const animRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── main draw ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay || !data.length || cw === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());

    const pad = { top: 28, right: 16, bottom: 44, left: 54 };
    const w = cw - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;

    // Setup canvases
    for (const c of [canvas, overlay]) {
      c.width = cw * dpr;
      c.height = height * dpr;
      c.style.width = `${cw}px`;
      c.style.height = `${height}px`;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Scales
    const tMin = sorted[0].date.getTime();
    const tMax = sorted[sorted.length - 1].date.getTime();
    const tRange = tMax - tMin || 1;

    const vals = sorted.map(d => d.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const vPad = Math.max(20, (rawMax - rawMin) * 0.15);
    const vMin = Math.min(rawMin - vPad, 0);
    const vMax = rawMax + vPad;

    const xOf = (d: Date) => pad.left + ((d.getTime() - tMin) / tRange) * w;
    const yOf = (v: number) => pad.top + (1 - (v - vMin) / (vMax - vMin)) * h;

    // ── CSS vars (read computed) ──
    const style = getComputedStyle(document.documentElement);
    const fg = style.getPropertyValue('--foreground').trim() || '#1a1a1a';
    const mutedFg = style.getPropertyValue('--muted-foreground').trim() || '#9ca3af';
    const border = style.getPropertyValue('--border').trim() || '#e5e7eb';
    const bg = style.getPropertyValue('--background').trim() || '#ffffff';
    const card = style.getPropertyValue('--card').trim() || '#f9f9f9';

    // Is dark mode?
    const isDark = document.documentElement.classList.contains('dark');
    const trendDelta = sorted[sorted.length - 1].value - sorted[0].value;
    const trendUp = trendDelta >= 0;
    const lineColor = trendUp ? '#22c55e' : '#ef4444';
    const gradTop = trendUp
      ? (isDark ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.14)')
      : (isDark ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.14)');
    const gradBot = trendUp ? 'rgba(34,197,94,0)' : 'rgba(239,68,68,0)';
    const dotFill = bg;
    const dotStroke = lineColor;

    ctx.clearRect(0, 0, cw, height);

    // ── Y grid + labels ──
    const yTicks = niceSteps(vMin, vMax, 5);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px system-ui, sans-serif';
    for (const v of yTicks) {
      const py = yOf(v);
      if (py < pad.top - 4 || py > pad.top + h + 4) continue;
      // grid
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(pad.left + w, py);
      ctx.stroke();
      ctx.setLineDash([]);
      // label
      ctx.fillStyle = mutedFg;
      ctx.fillText(fmtY(v), pad.left - 8, py);
    }

    // ── X ticks ──
    const diffDays = tRange / 86_400_000;
    let xDates: Date[] = [];

    if (rangeMode === 'weekly') {
      // One tick per day of the week
      const d = new Date(sorted[0].date);
      d.setHours(0, 0, 0, 0);
      for (let i = 0; i < 7; i++) {
        const nd = new Date(d);
        nd.setDate(d.getDate() + i);
        if (nd.getTime() <= tMax + 86_400_000) xDates.push(nd);
      }
    } else if (rangeMode === 'monthly') {
      // One tick per month
      const start = new Date(sorted[0].date);
      start.setDate(1); start.setHours(0, 0, 0, 0);
      const end = sorted[sorted.length - 1].date;
      const d = new Date(start);
      while (d <= end) {
        xDates.push(new Date(d));
        d.setMonth(d.getMonth() + 1);
      }
      // Always include the last month
      if (xDates.length > 0 && xDates[xDates.length - 1].getMonth() !== end.getMonth()) {
        const last = new Date(end);
        last.setDate(1); last.setHours(0, 0, 0, 0);
        xDates.push(last);
      }
    } else {
      // Max: auto-pick based on span
      if (diffDays <= 14) {
        const d = new Date(sorted[0].date);
        d.setHours(0, 0, 0, 0);
        while (d.getTime() <= tMax + 86_400_000) {
          xDates.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }
      } else if (diffDays <= 90) {
        const d = new Date(sorted[0].date);
        d.setHours(0, 0, 0, 0);
        // Weekly
        d.setDate(d.getDate() - d.getDay() + 1);
        while (d.getTime() <= tMax + 86_400_000 * 7) {
          xDates.push(new Date(d));
          d.setDate(d.getDate() + 7);
        }
      } else {
        const d = new Date(sorted[0].date);
        d.setDate(1); d.setHours(0, 0, 0, 0);
        while (d.getTime() <= tMax + 86_400_000 * 31) {
          xDates.push(new Date(d));
          d.setMonth(d.getMonth() + 1);
        }
      }
    }

    // Limit number of visible ticks to avoid overlap
    const maxTicks = Math.floor(w / 60);
    if (xDates.length > maxTicks) {
      const step = Math.ceil(xDates.length / maxTicks);
      xDates = xDates.filter((_, i) => i % step === 0);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = mutedFg;
    for (const d of xDates) {
      const px = xOf(d);
      if (px < pad.left || px > pad.left + w) continue;
      ctx.fillText(formatTick(d, rangeMode, diffDays), px, pad.top + h + 12);
    }

    // ── Animated line + area draw ──
    cancelAnimationFrame(animRef.current);
    let progress = 0;
    const duration = 600; // ms
    let startTime = 0;

    function buildPath(prog: number) {
      // Build smooth curve points
      const pts: [number, number][] = [];
      const n = sorted.length;
      const visibleCount = Math.max(2, Math.ceil(prog * n));

      for (let i = 0; i < visibleCount; i++) {
        pts.push([xOf(sorted[i].date), yOf(sorted[i].value)]);
      }
      // Partially interpolate the last segment
      if (visibleCount < n && prog < 1) {
        const frac = (prog * n) - Math.floor(prog * n);
        const prevPt = pts[pts.length - 1];
        const nextX = xOf(sorted[visibleCount].date);
        const nextY = yOf(sorted[visibleCount].value);
        pts.push([lerp(prevPt[0], nextX, frac), lerp(prevPt[1], nextY, frac)]);
      }
      return pts;
    }

    function frame(ts: number) {
      if (!startTime) startTime = ts;
      progress = Math.min(1, (ts - startTime) / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const pts = buildPath(ease);

      ctx.clearRect(pad.left - 1, pad.top - 1, w + 2, h + 2);

      // Re-draw grid (clipped area)
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.left, pad.top, w, h);
      ctx.clip();

      for (const v of yTicks) {
        const py = yOf(v);
        if (py < pad.top - 4 || py > pad.top + h + 4) continue;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pad.left, py);
        ctx.lineTo(pad.left + w, py);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (pts.length >= 2) {
        // Gradient fill
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
        grad.addColorStop(0, gradTop);
        grad.addColorStop(1, gradBot);

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pad.top + h);
        // Catmull-Rom to Bezier for smooth curves
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) {
            ctx.lineTo(pts[0][0], pts[0][1]);
          } else {
            const p0 = pts[Math.max(0, i - 2)];
            const p1 = pts[Math.max(0, i - 1)];
            const p2 = pts[i];
            const p3 = pts[Math.min(pts.length - 1, i + 1)];

            const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
          }
        }
        ctx.lineTo(pts[pts.length - 1][0], pad.top + h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Line
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) {
            ctx.moveTo(pts[0][0], pts[0][1]);
          } else {
            const p0 = pts[Math.max(0, i - 2)];
            const p1 = pts[Math.max(0, i - 1)];
            const p2 = pts[i];
            const p3 = pts[Math.min(pts.length - 1, i + 1)];

            const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
          }
        }
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Dots (if ≤ 25 points and animation is done)
        if (sorted.length <= 25 && progress >= 1) {
          for (const pt of pts) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 3.5, 0, Math.PI * 2);
            ctx.fillStyle = dotFill;
            ctx.fill();
            ctx.strokeStyle = dotStroke;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      ctx.restore();

      if (progress < 1) {
        animRef.current = requestAnimationFrame(frame);
      }
    }

    animRef.current = requestAnimationFrame(frame);

    // ── Hover interaction (overlay canvas) ──
    const octx = overlay.getContext('2d')!;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const tooltipEl = tooltipRef.current;

    function handleMove(e: MouseEvent) {
      if (!tooltipEl || !overlay) return;
      const rect = overlay.getBoundingClientRect();
      const mx = e.clientX - rect.left;

      // Find nearest point
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < sorted.length; i++) {
        const px = xOf(sorted[i].date);
        const dist = Math.abs(px - mx);
        if (dist < bestDist) { bestDist = dist; best = i; }
      }

      const nearest = sorted[best];
      const cx = xOf(nearest.date);
      const cy = yOf(nearest.value);

      // Draw crosshair
      octx.clearRect(0, 0, cw, height);
      octx.setLineDash([4, 4]);
      octx.strokeStyle = mutedFg;
      octx.lineWidth = 1;
      octx.globalAlpha = 0.5;
      octx.beginPath();
      octx.moveTo(cx, pad.top);
      octx.lineTo(cx, pad.top + h);
      octx.stroke();
      octx.beginPath();
      octx.moveTo(pad.left, cy);
      octx.lineTo(pad.left + w, cy);
      octx.stroke();
      octx.setLineDash([]);
      octx.globalAlpha = 1;

      // Hover dot
      octx.beginPath();
      octx.arc(cx, cy, 6, 0, Math.PI * 2);
      octx.fillStyle = bg;
      octx.fill();
      octx.strokeStyle = lineColor;
      octx.lineWidth = 3;
      octx.stroke();

      // Delta
      const prevVal = best > 0 ? sorted[best - 1].value : nearest.value;
      const delta = nearest.value - prevVal;
      const deltaStr = delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)}`;
      const deltaColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : mutedFg;

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dd = String(nearest.date.getDate()).padStart(2, '0');
      const mm = months[nearest.date.getMonth()];
      const yyyy = nearest.date.getFullYear();

      tooltipEl.innerHTML = `
        <div style="font-size:10px;font-weight:600;color:${mutedFg};margin-bottom:4px">${dd} ${mm} ${yyyy}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <span style="font-size:16px;font-weight:800;color:${fg}">${nearest.value.toLocaleString()}</span>
          <span style="font-size:11px;font-weight:700;color:${deltaColor}">${deltaStr}</span>
        </div>
      `;

      // Position tooltip
      const ttW = tooltipEl.offsetWidth || 130;
      const ttH = tooltipEl.offsetHeight || 56;
      let left = rect.left + cx - ttW / 2;
      let top = rect.top + cy - ttH - 16;
      if (left < rect.left + 4) left = rect.left + 4;
      if (left + ttW > rect.right - 4) left = rect.right - ttW - 4;
      if (top < rect.top) top = rect.top + cy + 16;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
      tooltipEl.style.opacity = '1';
    }

    function handleLeave() {
      octx.clearRect(0, 0, cw, height);
      if (tooltipEl) tooltipEl.style.opacity = '0';
    }

    overlay.addEventListener('mousemove', handleMove);
    overlay.addEventListener('mouseleave', handleLeave);

    return () => {
      cancelAnimationFrame(animRef.current);
      overlay.removeEventListener('mousemove', handleMove);
      overlay.removeEventListener('mouseleave', handleLeave);
    };
  }, [data, height, rangeMode, cw]);

  useEffect(() => {
    const cleanup = draw();
    return () => cleanup?.();
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <canvas ref={overlayRef} className="absolute inset-0" style={{ cursor: 'crosshair' }} />
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 120ms ease',
          zIndex: 60,
          borderRadius: 12,
          padding: '8px 14px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          minWidth: 120,
        }}
      />
    </div>
  );
}
