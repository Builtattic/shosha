'use client';

import * as d3 from 'd3';
import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
  date: Date;
  value: number;
}

interface Props {
  data?: DataPoint[];
  color?: string;
  height?: number;
}

export function AdminDashboardChart({ 
  data, 
  color = '#8b5cf6', 
  height = 300 
}: Props) {
  const ref = useRef<SVGSVGElement>(null);

  // Fallback data if none provided
  const chartData = useMemo(() => data || [
    { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), value: 45 },
    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), value: 52 },
    { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), value: 48 },
    { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), value: 70 },
    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), value: 65 },
    { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), value: 85 },
    { date: new Date(), value: 78 },
  ], [data]);

  useEffect(() => {
    if (!ref.current || chartData.length === 0) return;

    const sortedData = [...chartData].sort((a, b) => a.date.getTime() - b.date.getTime());
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const parentWidth = (ref.current.parentElement?.clientWidth || 800);
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const w = parentWidth - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${parentWidth} ${height}`);
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(sortedData, d => d.date) as [Date, Date])
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, Math.max(100, d3.max(sortedData, d => d.value) ?? 100)])
      .range([h, 0]).nice();

    // Custom Axes
    const xAxis = d3.axisBottom(x).ticks(7).tickFormat(d3.timeFormat('%a') as any).tickSize(0).tickPadding(20);
    const yAxis = d3.axisLeft(y).ticks(5).tickSize(-w).tickPadding(20);

    const yGroup = g.append('g').call(yAxis);
    yGroup.selectAll('.domain').remove();
    yGroup.selectAll('.tick line')
      .attr('stroke', 'rgba(255,255,255,0.05)')
      .attr('stroke-dasharray', '4,4');
    yGroup.selectAll('.tick text')
      .attr('fill', 'rgba(255,255,255,0.3)')
      .attr('font-size', '10px')
      .attr('font-weight', '900')
      .attr('text-transform', 'uppercase');

    const xGroup = g.append('g').attr('transform', `translate(0,${h})`).call(xAxis);
    xGroup.selectAll('.domain').remove();
    xGroup.selectAll('.tick text')
      .attr('fill', 'rgba(255,255,255,0.3)')
      .attr('font-size', '10px')
      .attr('font-weight', '900')
      .attr('text-transform', 'uppercase');

    // Area & Line
    const area = d3.area<DataPoint>()
      .x(d => x(d.date))
      .y0(h)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const line = d3.line<DataPoint>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Gradients
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'chartGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.15);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);

    const glowGrad = defs.append('filter').attr('id', 'glow');
    glowGrad.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = glowGrad.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Draw
    g.append('path')
      .datum(sortedData)
      .attr('fill', 'url(#chartGrad)')
      .attr('d', area);

    const path = g.append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('filter', 'url(#glow)')
      .attr('d', line);

    // Animation
    const totalLength = (path.node() as SVGPathElement).getTotalLength();
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Points
    g.selectAll('.dot')
      .data(sortedData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.value))
      .attr('r', 0)
      .attr('fill', '#fff')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .transition()
      .delay((d, i) => i * 150 + 1000)
      .duration(500)
      .attr('r', 4);

  }, [chartData, color, height]);

  return (
    <div className="w-full relative p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 overflow-hidden">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Protocol Activity Index</span>
      </div>
      <div className="mt-10">
        <svg ref={ref} className="w-full" style={{ height }} />
      </div>
    </div>
  );
}
