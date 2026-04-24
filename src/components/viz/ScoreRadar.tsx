'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { Breakdown } from '@/types';

const axes = ['authenticity', 'engagement', 'community', 'content', 'impact'] as const;

export function ScoreRadar({ breakdown }: { breakdown: Breakdown }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const size = 260;
    const center = size / 2;
    const radius = 92;
    svg.attr('viewBox', `0 0 ${size} ${size}`);
    const group = svg.append('g').attr('transform', `translate(${center},${center})`);
    const angle = (index: number) => (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const point = (value: number, index: number): [number, number] => [
      Math.cos(angle(index)) * radius * (value / 100),
      Math.sin(angle(index)) * radius * (value / 100)
    ];
    const line = d3.line<[number, number]>().x((d) => d[0]).y((d) => d[1]).curve(d3.curveLinearClosed);

    [25, 50, 75, 100].forEach((ring) => {
      group.append('path').attr('d', line(axes.map((_, index) => point(ring, index))) ?? '').attr('fill', 'none').attr('stroke', '#262626');
    });
    axes.forEach((axis, index) => {
      const [x, y] = point(108, index);
      group.append('line').attr('x1', 0).attr('y1', 0).attr('x2', x).attr('y2', y).attr('stroke', '#1a1a1a');
      group
        .append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', x > 8 ? 'start' : x < -8 ? 'end' : 'middle')
        .attr('fill', '#7a7a70')
        .attr('font-size', 9)
        .attr('font-family', 'var(--font-jetbrains-mono)')
        .text(axis.toUpperCase());
    });
    const dataPath = group
      .append('path')
      .attr('d', line(axes.map((_, index) => point(0, index))) ?? '')
      .attr('fill', 'rgba(212,255,74,0.18)')
      .attr('stroke', '#d4ff4a')
      .attr('stroke-width', 2);
    dataPath
      .transition()
      .duration(850)
      .attr('d', line(axes.map((axis, index) => point(breakdown[axis], index))) ?? '');
  }, [breakdown]);

  return <svg ref={ref} className="mx-auto h-auto w-full max-w-[260px]" role="img" aria-label="Score breakdown radar" />;
}
