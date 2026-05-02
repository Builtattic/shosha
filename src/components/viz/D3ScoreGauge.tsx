'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

interface Props {
  score: number;        // 0 – 100
  size?: number;
}

export function D3ScoreGauge({ score, size = 280 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const W = size;
    const H = size * 0.58;
    const cx = W / 2;
    const cy = H * 0.92;
    const outerR = W * 0.42;
    const innerR = W * 0.31;
    const arcThickness = outerR - innerR;

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    const startAngle = -Math.PI / 2;
    const endAngle = Math.PI / 2;

    // ── Segmented zone arcs (no gradient, solid flat colors) ───────────────
    // Three zones: low (0–33), mid (33–67), high (67–100)
    const zones = [
      { from: 0, to: 33, fill: '#fca5a5' }, // muted red
      { from: 33, to: 67, fill: '#fcd34d' }, // muted amber
      { from: 67, to: 100, fill: '#86efac' }, // muted green
    ];

    const arcGen = d3.arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .startAngle(d => d.startAngle)
      .endAngle(d => d.endAngle)
      .cornerRadius(2);

    // Background track — very light
    g.append('path')
      .datum({ startAngle, endAngle })
      .attr('d', d => arcGen(d) ?? '')
      .attr('fill', 'currentColor')
      .attr('class', 'text-border')
      .style('color', 'var(--border)');

    // Zone segments
    const scoreAngle = startAngle + (score / 100) * (endAngle - startAngle);

    // Dim background for each zone (always visible)
    zones.forEach(zone => {
      const za = startAngle + (zone.from / 100) * (endAngle - startAngle);
      const zb = startAngle + (zone.to / 100) * (endAngle - startAngle);
      g.append('path')
        .datum({ startAngle: za, endAngle: zb })
        .attr('d', d => arcGen(d) ?? '')
        .attr('fill', zone.fill)
        .attr('opacity', 0.18);
    });

    // Lit portion of each zone — clips to score position, animates in
    zones.forEach(zone => {
      const za = startAngle + (zone.from / 100) * (endAngle - startAngle);
      const zb = startAngle + (zone.to / 100) * (endAngle - startAngle);
      // Only draw if the score reaches into this zone at all
      if (scoreAngle <= za) return;
      const zEnd = Math.min(scoreAngle, zb);

      const litPath = g.append('path')
        .datum({ startAngle: za, endAngle: za })
        .attr('d', d => arcGen(d) ?? '')
        .attr('fill', zone.fill)
        .attr('opacity', 1);

      litPath.transition()
        .duration(1100)
        .ease(d3.easeCubicOut)
        .attrTween('d', function () {
          const interp = d3.interpolate(za, zEnd);
          return (t: number) => arcGen({ startAngle: za, endAngle: interp(t) }) ?? '';
        });
    });

    // Needle color matches zone
    const needleColor = score >= 67 ? '#16a34a' : score >= 33 ? '#d97706' : '#dc2626';

    // ── Thin separator ticks between zones ─────────────────────────────────
    [33, 67].forEach(v => {
      const a = startAngle + (v / 100) * (endAngle - startAngle) - Math.PI / 2;
      g.append('line')
        .attr('x1', Math.cos(a) * (innerR + 1))
        .attr('y1', Math.sin(a) * (innerR + 1))
        .attr('x2', Math.cos(a) * (outerR - 1))
        .attr('y2', Math.sin(a) * (outerR - 1))
        .attr('stroke', 'var(--background)')
        .attr('stroke-width', 2);
    });

    // ── Needle ─────────────────────────────────────────────────────────────
    const needleLen = outerR * 0.88;
    const needleAngleRad = startAngle + (score / 100) * (endAngle - startAngle) - Math.PI / 2;
    const needleStartRad = startAngle - Math.PI / 2;

    const needle = g.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', Math.cos(needleStartRad) * needleLen)
      .attr('y2', Math.sin(needleStartRad) * needleLen)
      .attr('stroke', needleColor)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0);

    needle.transition().duration(1100).ease(d3.easeCubicOut)
      .attr('x2', Math.cos(needleAngleRad) * needleLen)
      .attr('y2', Math.sin(needleAngleRad) * needleLen)
      .attr('opacity', 1);

    // Pivot dot — matches needle
    g.append('circle')
      .attr('r', 4)
      .attr('fill', needleColor)
      .attr('stroke', 'var(--background)')
      .attr('stroke-width', 2);

    // ── End-cap labels: LOW / HIGH ──────────────────────────────────────────
    const labelRadius = outerR + 14;
    const leftA = startAngle - Math.PI / 2;
    const rightA = endAngle - Math.PI / 2;

    g.append('text')
      .attr('x', Math.cos(leftA) * labelRadius)
      .attr('y', Math.sin(leftA) * labelRadius)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--muted-foreground)')
      .attr('font-size', size * 0.058)
      .attr('font-weight', '600')
      .attr('font-family', 'var(--font-instrument-sans), sans-serif')
      .attr('letter-spacing', '0.04em')
      .text('LOW');

    g.append('text')
      .attr('x', Math.cos(rightA) * labelRadius)
      .attr('y', Math.sin(rightA) * labelRadius)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--muted-foreground)')
      .attr('font-size', size * 0.058)
      .attr('font-weight', '600')
      .attr('font-family', 'var(--font-instrument-sans), sans-serif')
      .attr('letter-spacing', '0.04em')
      .text('HIGH');

  }, [score, size]);

  return (
    <svg
      ref={ref}
      className="w-full h-auto"
      style={{ maxWidth: size }}
      role="img"
      aria-label={`Credibility: ${score}`}
    />
  );
}
