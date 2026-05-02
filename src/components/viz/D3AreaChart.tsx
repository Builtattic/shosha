'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

interface DataPoint {
  date: Date;
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  height?: number;
}

export function D3AreaChart({ data, color = 'var(--foreground)', height = 240 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    // Sort data
    const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    // Get current container width
    const parentWidth = (ref.current.parentElement?.clientWidth || 400);
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const w = parentWidth - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${parentWidth} ${height}`);
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(sortedData, d => d.date) as [Date, Date])
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([Math.min(0, d3.min(sortedData, d => d.value) ?? 0), Math.max(100, d3.max(sortedData, d => d.value) ?? 100)])
      .range([h, 0]).nice();

    // Axes
    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b \'%y') as any).tickSize(0).tickPadding(10);
    const yAxis = d3.axisLeft(y).ticks(5).tickSize(-w).tickPadding(10);

    // Render Y Axis (with grid lines)
    const yGroup = g.append('g')
      .call(yAxis);
    
    yGroup.selectAll('.domain').remove();
    yGroup.selectAll('.tick line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-dasharray', '2,2');
    yGroup.selectAll('.tick text')
      .attr('fill', 'var(--muted-foreground)')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .text((d: any) => d >= 1000 || d <= -1000 ? `${d / 1000}k` : d);

    // Render X Axis
    const xGroup = g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(xAxis);
    
    xGroup.selectAll('.domain').remove();
    xGroup.selectAll('.tick text')
      .attr('fill', 'var(--muted-foreground)')
      .attr('font-size', '10px')
      .attr('font-weight', '500');

    // Area generator
    const area = d3.area<DataPoint>()
      .x(d => x(d.date))
      .y0(y(0))
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3.line<DataPoint>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Gradient
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'areaGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.2);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);

    // Draw Area
    g.append('path')
      .datum(sortedData)
      .attr('fill', 'url(#areaGrad)')
      .attr('d', area);

    // Draw Line
    g.append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', line);

    // Last point tooltip
    const lastPoint = sortedData[sortedData.length - 1];
    if (lastPoint) {
      g.append('circle')
        .attr('cx', x(lastPoint.date))
        .attr('cy', y(lastPoint.value))
        .attr('r', 4)
        .attr('fill', 'var(--background)')
        .attr('stroke', color)
        .attr('stroke-width', 2);

      // Tooltip box
      const tooltip = g.append('g')
        .attr('transform', `translate(${x(lastPoint.date) - 80}, ${y(lastPoint.value) - 45})`);
      
      tooltip.append('rect')
        .attr('width', 80)
        .attr('height', 35)
        .attr('rx', 6)
        .attr('fill', 'var(--card)')
        .attr('stroke', 'var(--border)')
        .attr('stroke-width', 1)
        .attr('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))');
      
      tooltip.append('text')
        .attr('x', 40)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--muted-foreground)')
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .text(d3.timeFormat('%b %d, %Y')(lastPoint.date));

      tooltip.append('text')
        .attr('x', 40)
        .attr('y', 27)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', '12px')
        .attr('font-weight', '800')
        .text(lastPoint.value.toLocaleString());
    }

  }, [data, color, height]);

  return (
    <div className="w-full">
      <svg ref={ref} className="w-full" style={{ height }} />
    </div>
  );
}
