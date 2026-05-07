'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface DonutData {
  label: string;
  value: number;
  color?: string;
}

interface D3DonutChartProps {
  data: DonutData[];
  width?: number;
  height?: number;
  innerRadius?: number;
}

export function D3DonutChart({ data, width = 200, height = 200, innerRadius = 60 }: D3DonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const radius = Math.min(width, height) / 2;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const defaultColors = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b']);

    const pie = d3.pie<DonutData>()
      .value(d => Math.abs(d.value))
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<DonutData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcs = svg.selectAll('arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('fill', d => d.data.color || (defaultColors(d.data.label) as string))
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', '2px')
      .style('transition', 'fill 0.3s ease')
      .transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(i(t)) as string;
        }
      });

  }, [data, width, height, innerRadius]);

  return <div ref={containerRef} className="flex justify-center items-center" />;
}
