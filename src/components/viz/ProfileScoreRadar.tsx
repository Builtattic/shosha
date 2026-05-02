'use client';

import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import type { DimensionScore } from '@/lib/scoring';

interface Props {
  dimensions: DimensionScore[];
  size?: number;
}

interface TooltipState {
  x: number;
  y: number;
  dim: DimensionScore;
}

export function ProfileScoreRadar({ dimensions, size = 320 }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (!svgRef.current || !dimensions.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.34;          // max polygon radius
    const labelR = size * 0.44;     // label ring radius
    const N = dimensions.length;
    const levels = 5;               // grid rings

    svg.attr('viewBox', `0 0 ${size} ${size}`).attr('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // angle for axis i (start at top, go clockwise)
    const angle = (i: number) => (2 * Math.PI * i) / N - Math.PI / 2;

    // (x, y) on axis i at normalised t ∈ [0,1]
    const pt = (t: number, i: number): [number, number] => [
      Math.cos(angle(i)) * R * t,
      Math.sin(angle(i)) * R * t,
    ];

    // ── Grid rings ────────────────────────────────────────────────────────
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveLinearClosed);

    for (let lvl = 1; lvl <= levels; lvl++) {
      const t = lvl / levels;
      g.append('path')
        .datum(dimensions.map((_, i) => pt(t, i)))
        .attr('d', d => lineGen(d) ?? '')
        .attr('fill', 'none')
        .attr('stroke', 'var(--border)')
        .attr('stroke-opacity', lvl === levels ? 1 : 0.65)
        .attr('stroke-width', lvl === levels ? 1.5 : 0.8)
        .attr('stroke-dasharray', lvl === levels ? 'none' : '3,3');
    }

    // ── Axis spokes ───────────────────────────────────────────────────────
    dimensions.forEach((_, i) => {
      const [x, y] = pt(1, i);
      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', x).attr('y2', y)
        .attr('stroke', 'var(--border)')
        .attr('stroke-width', 1);
    });

    // ── Data polygon ──────────────────────────────────────────────────────
    // normalise value 0.5–3 to 0–1
    const norm = (v: number) => (v - 0.5) / 2.5;

    const dataPoints = dimensions.map((d, i) => pt(norm(d.value), i));

    // ghost (start from zero for animation)
    const zeroPoints = dimensions.map((_, i) => pt(0, i));

    const dataPath = g.append('path')
      .datum(zeroPoints)
      .attr('d', d => lineGen(d) ?? '')
      .attr('fill', 'var(--foreground)')
      .attr('fill-opacity', 0.08)
      .attr('stroke', 'var(--foreground)')
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round');

    // animate in
    dataPath
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr('d', lineGen(dataPoints) ?? '');

    // ── Vertex dots (interactive) ─────────────────────────────────────────
    dimensions.forEach((dim, i) => {
      const [x, y] = pt(norm(dim.value), i);
      const [x0, y0] = pt(0, i);

      const dot = g.append('circle')
        .attr('cx', x0).attr('cy', y0)
        .attr('r', 4)
        .attr('fill', 'var(--foreground)')
        .attr('stroke', 'var(--background)')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .attr('opacity', 0);

      dot.transition().duration(900).ease(d3.easeCubicOut)
        .attr('cx', x).attr('cy', y)
        .attr('opacity', 1);

      // hover area (larger invisible circle)
      g.append('circle')
        .attr('cx', x).attr('cy', y)
        .attr('r', 14)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent) => {
          dot.attr('r', 6).attr('fill', 'var(--foreground)');
          const svgRect = svgRef.current!.getBoundingClientRect();
          setTooltip({
            x: event.clientX - svgRect.left,
            y: event.clientY - svgRect.top,
            dim,
          });
        })
        .on('mousemove', (event: MouseEvent) => {
          const svgRect = svgRef.current!.getBoundingClientRect();
          setTooltip(prev => prev ? {
            ...prev,
            x: event.clientX - svgRect.left,
            y: event.clientY - svgRect.top,
          } : null);
        })
        .on('mouseleave', () => {
          dot.attr('r', 4).attr('fill', 'var(--foreground)');
          setTooltip(null);
        });
    });

    // ── Axis labels ───────────────────────────────────────────────────────
    dimensions.forEach((dim, i) => {
      const [lx, ly] = [
        Math.cos(angle(i)) * labelR,
        Math.sin(angle(i)) * labelR,
      ];
      const anchor = Math.abs(lx) < 8 ? 'middle' : lx > 0 ? 'start' : 'end';

      // key badge background
      const badgeW = 28, badgeH = 16;
      g.append('rect')
        .attr('x', lx - (anchor === 'middle' ? badgeW / 2 : anchor === 'start' ? 0 : badgeW))
        .attr('y', ly - badgeH / 2 - 1)
        .attr('width', badgeW)
        .attr('height', badgeH)
        .attr('rx', 3)
        .attr('fill', 'var(--foreground)');

      g.append('text')
        .attr('x', lx - (anchor === 'middle' ? 0 : anchor === 'start' ? -badgeW / 2 : badgeW / 2))
        .attr('y', ly + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'var(--background)')
        .attr('font-size', 9)
        .attr('font-weight', '800')
        .attr('font-family', 'var(--font-dm-mono), monospace')
        .attr('letter-spacing', '0.04em')
        .text(dim.key);

      // level label below badge
      g.append('text')
        .attr('x', lx - (anchor === 'middle' ? 0 : anchor === 'start' ? -badgeW / 2 : badgeW / 2))
        .attr('y', ly + badgeH / 2 + 8)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'var(--muted-foreground)')
        .attr('font-size', 8)
        .attr('font-family', 'var(--font-instrument-sans), sans-serif')
        .text(dim.levelLabel);
    });

  }, [dimensions, size]);

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        className="w-full h-auto"
        style={{ maxWidth: size }}
        aria-label="Profile score radar"
        role="img"
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-border bg-background shadow-lg px-3 py-2.5 text-xs"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 40,
            transform: tooltip.x > size * 0.65 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-mono font-black text-[10px] bg-foreground text-background px-1 py-0.5 rounded-sm">
              {tooltip.dim.key}
            </span>
            <span className="font-semibold">{tooltip.dim.fullName}</span>
          </div>
          <div className="text-muted-foreground">{tooltip.dim.levelLabel} <span className="opacity-60">({tooltip.dim.value})</span></div>
          <div className="text-muted-foreground mt-0.5">{tooltip.dim.description}</div>
        </div>
      )}
    </div>
  );
}
