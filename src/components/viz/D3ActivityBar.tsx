'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

interface Props {
  positive: number;
  negative: number;
  neutral: number;
  height?: number;
}

export function D3ActivityBar({ positive, negative, neutral, height = 8 }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const total = positive + negative + neutral;
    if (total === 0) return;

    // Use percentage widths
    const posPct = (positive / total) * 100;
    const negPct = (negative / total) * 100;
    const neuPct = (neutral / total) * 100;

    svg.attr('width', '100%').attr('height', height).attr('rx', height / 2);

    const g = svg.append('g');

    // To make rounded corners for each segment without overlapping weirdly,
    // we can draw rectangles and use clip-path to round the outer edges of the whole bar.
    
    // Add clip path
    const clipId = `clip-rounded-${Math.random().toString(36).substr(2, 9)}`;
    svg.append('defs').append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', '100%')
      .attr('height', height)
      .attr('rx', height / 2)
      .attr('ry', height / 2);

    const clippedGroup = g.attr('clip-path', `url(#${clipId})`);

    // Positive
    clippedGroup.append('rect')
      .attr('x', '0%')
      .attr('y', 0)
      .attr('width', `${posPct}%`)
      .attr('height', height)
      .attr('fill', '#4ade80'); // Green

    // Negative
    clippedGroup.append('rect')
      .attr('x', `${posPct}%`)
      .attr('y', 0)
      .attr('width', `${negPct}%`)
      .attr('height', height)
      .attr('fill', '#f87171'); // Red

    // Neutral
    clippedGroup.append('rect')
      .attr('x', `${posPct + negPct}%`)
      .attr('y', 0)
      .attr('width', `${neuPct}%`)
      .attr('height', height)
      .attr('fill', '#d1d5db'); // Gray

    // Add small white gaps between sections
    if (posPct > 0 && negPct > 0) {
      clippedGroup.append('rect')
        .attr('x', `calc(${posPct}% - 1px)`)
        .attr('y', 0)
        .attr('width', 2)
        .attr('height', height)
        .attr('fill', '#ffffff');
    }
    if ((posPct > 0 || negPct > 0) && neuPct > 0) {
      clippedGroup.append('rect')
        .attr('x', `calc(${posPct + negPct}% - 1px)`)
        .attr('y', 0)
        .attr('width', 2)
        .attr('height', height)
        .attr('fill', '#ffffff');
    }

  }, [positive, negative, neutral, height]);

  return (
    <svg ref={ref} className="w-full" style={{ height }} />
  );
}
