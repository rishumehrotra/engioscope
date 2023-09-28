import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Ribbon } from 'd3-chord';
import { chord as d3Chord, ribbon as d3Ribbon } from 'd3-chord';
import type { DefaultArcObject } from 'd3-shape';
import { arc as d3Arc } from 'd3-shape';

export const defaultDisplay = {
  arcTickness: 10,
};

type ChordDiagramProps<T> = {
  data?: T[];
  getRelated: (d: T) => T[];
  display?: typeof defaultDisplay;
  lineColor: (x: T) => string;
  ribbonTooltip: (source: T | undefined, target: T | undefined) => string | undefined;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const constructMatrix = <T extends {}>(data: T[], getRelated: (d: T) => T[]) => {
  const matrix: number[][] = [];
  data.forEach((dataItem, i) => {
    const related = getRelated(dataItem);
    const row = Array.from({ length: data.length }).fill(0) as number[];
    related.forEach(r => {
      const j = data.indexOf(r);
      row[j] = 1;
    });
    matrix[i] = row;
  });
  return matrix;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const ChordDiagram = <T extends {}>({
  data,
  getRelated,
  display = defaultDisplay,
  lineColor,
  ribbonTooltip,
}: ChordDiagramProps<T>) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const setDimensions = () => {
      const svg = svgRef.current;
      if (!svg) return;

      const { width, height } = svg.getBoundingClientRect();
      setSvgDimensions({ width, height });
    };

    setDimensions();
    window.addEventListener('resize', setDimensions);
    return () => window.removeEventListener('resize', setDimensions);
  }, []);

  const chords = useMemo(() => {
    const chord = d3Chord();

    return chord(constructMatrix(data || [], getRelated));
  }, [data, getRelated]);

  const outerRadius = Math.min(svgDimensions.width, svgDimensions.height) * 0.5;
  const innerRadius = outerRadius - display.arcTickness;

  return (
    <svg
      width="100%"
      height="100%"
      ref={svgRef}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <g transform={`translate(${svgDimensions.width / 2}, ${svgDimensions.height / 2})`}>
        {chords.groups.map(group => {
          const arc = d3Arc().innerRadius(innerRadius).outerRadius(outerRadius);
          const service = data?.[group.index];
          const color = service ? lineColor(service) : 'black';

          return (
            <path
              key={group.index}
              d={arc(group as unknown as DefaultArcObject) || undefined}
              fill={color}
            />
          );
        })}

        {chords.map(chord => {
          const ribbon = d3Ribbon().radius(innerRadius);
          const service = data?.[chord.source.index];
          const color = service ? `${lineColor(service)}99` : 'black';

          return (
            <path
              key={chord.source.index}
              d={(ribbon(chord as unknown as Ribbon) as unknown as string | null) || ''}
              fill={color}
              data-tooltip-id="react-tooltip"
              data-tooltip-html={ribbonTooltip(
                data?.at(chord.source.index),
                data?.at(chord.target.index)
              )}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default ChordDiagram;
