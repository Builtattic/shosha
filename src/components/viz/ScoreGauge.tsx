'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export function ScoreGauge({ score }: { score: number }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const width = 320;
    const height = 180;
    const radius = 132;
    const centerX = width / 2;
    const centerY = height - 18;
    const angle = d3.scaleLinear().domain([0, 100]).range([-Math.PI / 2, Math.PI / 2]);
    const arc = d3.arc<d3.DefaultArcObject>().innerRadius(radius - 14).outerRadius(radius);
    const color = score >= 75 ? '#6ee787' : score >= 50 ? '#d4ff4a' : score >= 30 ? '#ffa24a' : '#ff4466';

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const group = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);
    group
      .append('path')
      .attr('d', arc({ innerRadius: radius - 14, outerRadius: radius, startAngle: -Math.PI / 2, endAngle: Math.PI / 2 }) ?? '')
      .attr('fill', '#262626');

    const foreground = group.append('path').attr('fill', color);
    foreground
      .transition()
      .duration(1300)
      .ease(d3.easeCubicOut)
      .attrTween('d', () => {
        const interpolate = d3.interpolate(-Math.PI / 2, angle(score));
        return (time) =>
          arc({
            innerRadius: radius - 14,
            outerRadius: radius,
            startAngle: -Math.PI / 2,
            endAngle: interpolate(time)
          }) ?? '';
      });

    for (let tick = 0; tick <= 100; tick += 5) {
      const a = angle(tick) - Math.PI / 2;
      const outer = radius + 4;
      const inner = tick % 25 === 0 ? radius - 14 : radius - 7;
      group
        .append('line')
        .attr('x1', Math.cos(a) * inner)
        .attr('y1', Math.sin(a) * inner)
        .attr('x2', Math.cos(a) * outer)
        .attr('y2', Math.sin(a) * outer)
        .attr('stroke', tick % 25 === 0 ? '#f5f5f0' : '#555555')
        .attr('stroke-width', tick % 25 === 0 ? 1.5 : 1);
    }

    const needleAngle = angle(score) - Math.PI / 2;
    group
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', Math.cos(needleAngle) * (radius - 32))
      .attr('y2', Math.sin(needleAngle) * (radius - 32))
      .attr('stroke', '#f5f5f0')
      .attr('stroke-width', 2);
    group.append('circle').attr('r', 5).attr('fill', '#d4ff4a');
  }, [score]);

  return (
    <div className="relative">
      <svg ref={ref} className="h-auto w-full" role="img" aria-label={`Shosha Score ${score}`} />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center">
        <p className="font-serif text-[64px] leading-none text-text">{score}</p>
        <p className="text-[10px] uppercase text-muted">Shosha Score</p>
      </div>
    </div>
  );
}
