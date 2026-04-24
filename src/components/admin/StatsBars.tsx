'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export function StatsBars({ stats }: { stats: Record<string, number> }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const entries = Object.entries(stats);
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const width = 320;
    const height = 160;
    const x = d3.scaleBand().domain(entries.map(([key]) => key)).range([20, width - 10]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(entries, ([, value]) => value) || 1]).range([height - 30, 10]);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg
      .selectAll('rect')
      .data(entries)
      .enter()
      .append('rect')
      .attr('x', ([key]) => x(key) ?? 0)
      .attr('y', height - 30)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', '#d4ff4a')
      .transition()
      .duration(700)
      .attr('y', ([, value]) => y(value))
      .attr('height', ([, value]) => height - 30 - y(value));
    svg
      .selectAll('text')
      .data(entries)
      .enter()
      .append('text')
      .attr('x', ([key]) => (x(key) ?? 0) + x.bandwidth() / 2)
      .attr('y', height - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7a7a70')
      .attr('font-size', 8)
      .text(([key]) => key.replace(/[A-Z].*/, ''));
  }, [stats]);

  return <svg ref={ref} className="h-auto w-full" role="img" aria-label="Tribunal stats" />;
}
