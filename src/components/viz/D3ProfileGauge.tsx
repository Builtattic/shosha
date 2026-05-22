'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

interface Props {
  score: number; // e.g. 842
  minScore?: number; // e.g. -99000
  maxScore?: number; // e.g. 101000
  size?: number;
}

export function D3ProfileGauge({ score, minScore = -99000, maxScore = 101000, size = 320 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const W = size;
    const H = size * 0.58;
    const cx = W / 2;
    const cy = H * 0.92;
    const arcWidth = size * 0.05;
    const radius = W * 0.46;

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Gradient
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'profileGaugeGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#f87171');
    grad.append('stop').attr('offset', '50%').attr('stop-color', '#fcd34d');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#4ade80');

    // Background track (very faint, if any. The image just shows the solid color track)
    // Use a true top semicircle (left -> top -> right).
    const startAngle = -Math.PI / 2;
    const endAngle = Math.PI / 2;

    const arcGen = d3.arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(radius - arcWidth / 2)
      .outerRadius(radius + arcWidth / 2)
      .startAngle(d => d.startAngle)
      .endAngle(d => d.endAngle)
      .cornerRadius(arcWidth / 2);

    // Full gradient arc
    g.append('path')
      .datum({ startAngle, endAngle })
      .attr('fill', 'url(#profileGaugeGrad)')
      .attr('d', d => arcGen(d) ?? '');

    // Pointer Circle
    const clampedScore = Math.max(minScore, Math.min(maxScore, score));
    const scoreRatio = (clampedScore - minScore) / (maxScore - minScore);
    const scoreAngle = startAngle + scoreRatio * (endAngle - startAngle);

    // Start circle at the beginning of the arc, then animate
    const pointer = g.append('circle')
      .attr('r', Math.max(5, arcWidth * 0.42))
      .attr('fill', 'var(--background)')
      .attr('stroke', 'var(--foreground)')
      .attr('stroke-width', 3)
      .attr('cx', Math.cos(startAngle - Math.PI / 2) * radius)
      .attr('cy', Math.sin(startAngle - Math.PI / 2) * radius);

    pointer.transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attrTween('cx', () => {
        const i = d3.interpolate(startAngle, scoreAngle);
        return (t) => String(Math.cos(i(t) - Math.PI / 2) * radius);
      })
      .attrTween('cy', () => {
        const i = d3.interpolate(startAngle, scoreAngle);
        return (t) => String(Math.sin(i(t) - Math.PI / 2) * radius);
      });

    // Labels — scale with gauge size so − / + stay readable
    const labelSize = Math.max(18, Math.round(size * 0.06));
    const labelY = Math.round(size * 0.06);
    g.append('text')
      .attr('x', -radius)
      .attr('y', labelY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--muted-foreground)')
      .attr('font-size', labelSize)
      .attr('font-weight', '700')
      .text('-');

    g.append('text')
      .attr('x', radius)
      .attr('y', labelY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--muted-foreground)')
      .attr('font-size', labelSize)
      .attr('font-weight', '700')
      .text('+');

  }, [score, minScore, maxScore, size]);

  return (
    <svg
      ref={ref}
      className="w-full h-auto mx-auto"
      style={{ maxWidth: size }}
      role="img"
    />
  );
}
