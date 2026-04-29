'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

interface Props {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  fillOpacity?: number;
}

export function D3Sparkline({ 
  data, 
  color = '#4ade80', 
  width = 100, 
  height = 30,
  strokeWidth = 2,
  fillOpacity = 0.1
}: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const min = d3.min(data) ?? 0;
    const max = d3.max(data) ?? 0;
    const paddedMin = min - (max - min) * 0.1;
    const paddedMax = max + (max - min) * 0.1;

    const xScale = d3.scaleLinear()
      .domain([0, Math.max(1, data.length - 1)])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([paddedMin, paddedMax])
      .range([height, 0]);

    const line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    const area = d3.area<number>()
      .x((_, i) => xScale(i))
      .y0(height)
      .y1(d => yScale(d))
      .curve(d3.curveMonotoneX);

    // Area
    svg.append('path')
      .datum(data)
      .attr('fill', color)
      .attr('fill-opacity', fillOpacity)
      .attr('d', area);

    // Line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', line);

  }, [data, color, width, height, strokeWidth, fillOpacity]);

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    />
  );
}
