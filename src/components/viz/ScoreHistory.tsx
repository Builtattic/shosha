'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { ScoreHistoryPoint } from '@/types';

export function ScoreHistory({ points }: { points: ScoreHistoryPoint[] }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const data = points.length > 1 ? points : [...points, { ...points[0], t: new Date(), s: points[0]?.s ?? 60 }];
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const width = 320;
    const height = 150;
    const margin = { top: 12, right: 12, bottom: 22, left: 28 };
    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.t)) as [Date, Date])
      .range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
    const line = d3
      .line<ScoreHistoryPoint>()
      .x((d) => x(new Date(d.t)))
      .y((d) => y(d.s))
      .curve(d3.curveMonotoneX);
    const area = d3
      .area<ScoreHistoryPoint>()
      .x((d) => x(new Date(d.t)))
      .y0(height - margin.bottom)
      .y1((d) => y(d.s))
      .curve(d3.curveMonotoneX);

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient').attr('id', 'history-fill').attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#d4ff4a').attr('stop-opacity', 0.25);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#d4ff4a').attr('stop-opacity', 0);
    [0, 50, 100].forEach((tick) => {
      svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(tick)).attr('y2', y(tick)).attr('stroke', '#262626');
    });
    svg.append('path').datum(data).attr('d', area).attr('fill', 'url(#history-fill)');
    const path = svg.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', '#d4ff4a').attr('stroke-width', 2);
    const length = path.node()?.getTotalLength() ?? 0;
    path.attr('stroke-dasharray', length).attr('stroke-dashoffset', length).transition().duration(900).attr('stroke-dashoffset', 0);
  }, [points]);

  return <svg ref={ref} className="h-auto w-full" role="img" aria-label="Score history" />;
}
