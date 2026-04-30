'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

interface Props {
  score: number;        // 0 – 100
  credibility: number;  // 0 – 100 (shown as secondary label)
  label?: string;
  size?: number;
}

export function D3ScoreGauge({ score, credibility, label = 'Shosha Score', size = 280 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const W = size;
    const H = size * 0.62;          // half-pie height + some room below
    const cx = W / 2;
    const cy = H * 0.88;            // pivot point sits near bottom
    const outerR = W * 0.44;
    const innerR = W * 0.30;
    const trackR  = outerR + 4;     // tick-mark ring radius

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // ── Gradient defs ──────────────────────────────────────────────────────
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'gaugeGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#f87171');   // red (low)
    grad.append('stop').attr('offset', '50%').attr('stop-color', '#d1d5db'); // grey (mid)
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#1a1a1a'); // black (high)

    // ── Arc generators ─────────────────────────────────────────────────────
    // Gauge spans from -π/2 (left) to π/2 (right) — a half circle opening downward
    const startAngle = -Math.PI / 2;
    const endAngle   = Math.PI / 2;

    const trackArc = d3.arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .startAngle(d => d.startAngle)
      .endAngle(d => d.endAngle)
      .cornerRadius(outerR - innerR);

    // Background track
    g.append('path')
      .datum({ startAngle, endAngle })
      .attr('d', d => trackArc(d) ?? '')
      .attr('fill', '#f3f4f6');

    // Active fill — animates from start to score position
    const scoreAngle = startAngle + (score / 100) * (endAngle - startAngle);

    const fillPath = g.append('path')
      .datum({ startAngle, endAngle: startAngle })
      .attr('fill', 'url(#gaugeGrad)')
      .attr('d', d => trackArc(d) ?? '');

    fillPath.transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attrTween('d', function () {
        const interp = d3.interpolate(startAngle, scoreAngle);
        return (t: number) => trackArc({ startAngle, endAngle: interp(t) }) ?? '';
      });

    // ── Needle ─────────────────────────────────────────────────────────────
    const needleLen = outerR * 0.92;
    const needleAngleRad = startAngle + (score / 100) * (endAngle - startAngle) - Math.PI / 2;

    // Start at straight-down (angle = -π/2 from center = pointing down)
    const needleStartRad = startAngle - Math.PI / 2;

    const needle = g.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', Math.cos(needleStartRad) * needleLen)
      .attr('y2', Math.sin(needleStartRad) * needleLen)
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0);

    needle.transition().duration(1200).ease(d3.easeCubicOut)
      .attr('x2', Math.cos(needleAngleRad) * needleLen)
      .attr('y2', Math.sin(needleAngleRad) * needleLen)
      .attr('opacity', 1);

    // Pivot dot
    g.append('circle')
      .attr('r', 6)
      .attr('fill', '#1a1a1a')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // ── Tick marks ─────────────────────────────────────────────────────────
    const ticks = [0, 25, 50, 75, 100];
    ticks.forEach(v => {
      const a = startAngle + (v / 100) * (endAngle - startAngle) - Math.PI / 2;
      const x1 = Math.cos(a) * (outerR + 2);
      const y1 = Math.sin(a) * (outerR + 2);
      const x2 = Math.cos(a) * (trackR + 5);
      const y2 = Math.sin(a) * (trackR + 5);
      g.append('line')
        .attr('x1', x1).attr('y1', y1)
        .attr('x2', x2).attr('y2', y2)
        .attr('stroke', '#d1d5db')
        .attr('stroke-width', 1.5);

      // Tick labels for 0, 50, 100
      if (v === 0 || v === 50 || v === 100) {
        const lx = Math.cos(a) * (trackR + 16);
        const ly = Math.sin(a) * (trackR + 16);
        g.append('text')
          .attr('x', lx).attr('y', ly)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#9ca3af')
          .attr('font-size', 9)
          .attr('font-family', 'var(--font-dm-mono), monospace')
          .text(String(v));
      }
    });

    // ── Center score text ──────────────────────────────────────────────────
    // Big score number
    const scoreText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -innerR * 0.15)
      .attr('fill', '#1a1a1a')
      .attr('font-size', size * 0.18)
      .attr('font-weight', '900')
      .attr('font-family', 'var(--font-instrument-sans), sans-serif')
      .attr('opacity', 0)
      .text('0');

    scoreText.transition().duration(1200).ease(d3.easeCubicOut)
      .attr('opacity', 1)
      .tween('text', function () {
        const interp = d3.interpolateNumber(0, score);
        return (t: number) => { this.textContent = String(Math.round(interp(t))); };
      });

    // Label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -innerR * 0.15 + size * 0.075)
      .attr('fill', '#6b7280')
      .attr('font-size', 9)
      .attr('font-weight', '700')
      .attr('font-family', 'var(--font-instrument-sans), sans-serif')
      .attr('letter-spacing', '0.08em')
      .text(label.toUpperCase());

    // Credibility sub-label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -innerR * 0.15 + size * 0.14)
      .attr('fill', '#9ca3af')
      .attr('font-size', 8.5)
      .attr('font-family', 'var(--font-instrument-sans), sans-serif')
      .text(`Credibility ${credibility}%`);

  }, [score, credibility, label, size]);

  return (
    <svg
      ref={ref}
      className="w-full h-auto mx-auto"
      style={{ maxWidth: size }}
      role="img"
      aria-label={`${label}: ${score}`}
    />
  );
}
