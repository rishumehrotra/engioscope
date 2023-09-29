import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Ribbon } from 'd3-chord';
import { chord as d3Chord, ribbon as d3Ribbon } from 'd3-chord';
import type { DefaultArcObject } from 'd3-shape';
import { arc as d3Arc } from 'd3-shape';

export const defaultDisplay = {
  arcTickness: 10,
  gapBetweenChordsRadians: 0.03,
};

// eslint-disable-next-line @typescript-eslint/ban-types
const constructMatrix = <T extends {}>(
  data: T[],
  getRelated: (d: T) => T[],
  weight: (from: T, to: T) => number
) => {
  const matrix: number[][] = [];
  data.forEach((dataItem, i) => {
    const related = getRelated(dataItem);
    const row = Array.from({ length: data.length }).fill(0) as number[];
    related.forEach(r => {
      const j = data.indexOf(r);
      row[j] = weight(dataItem, r);
    });
    matrix[i] = row;
  });
  return matrix;
};

type ChordDiagramProps<T> = {
  data?: T[];
  getRelated: (d: T) => T[];
  display?: typeof defaultDisplay;
  lineColor: (x: T) => string;
  ribbonTooltip: (source: T | undefined, target: T | undefined) => string | undefined;
  getKey: (x: T) => string;
  ribbonWeight: (from: T, to: T) => number;
  chordTooltip: (x: T) => string | undefined;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const ChordDiagram = <T extends {}>({
  data,
  getRelated,
  display = defaultDisplay,
  lineColor,
  ribbonTooltip,
  getKey,
  ribbonWeight,
  chordTooltip,
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
    const chord = d3Chord().padAngle(display.gapBetweenChordsRadians);

    return chord(constructMatrix(data || [], getRelated, ribbonWeight));
  }, [data, display.gapBetweenChordsRadians, getRelated, ribbonWeight]);

  const outerRadius = Math.min(svgDimensions.width, svgDimensions.height) * 0.5;
  const innerRadius = outerRadius - display.arcTickness;

  const arc = useMemo(
    () => d3Arc().innerRadius(innerRadius).outerRadius(outerRadius),
    [innerRadius, outerRadius]
  );

  const ribbon = useMemo(() => d3Ribbon().radius(innerRadius), [innerRadius]);

  return (
    <svg
      width="100%"
      height="100%"
      ref={svgRef}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <g transform={`translate(${svgDimensions.width / 2}, ${svgDimensions.height / 2})`}>
        {chords.groups.map(group => {
          const dataItem = data?.at(group.index);
          if (!dataItem) return null;

          return (
            <path
              key={getKey(dataItem)}
              d={arc(group as unknown as DefaultArcObject) || undefined}
              fill={lineColor(dataItem)}
              className="hover:opacity-70"
              data-tooltip-id="react-tooltip"
              data-tooltip-html={chordTooltip(dataItem)}
            />
          );
        })}

        {chords.map(chord => {
          const dataItem = data?.at(chord.source.index);
          if (!dataItem) return null;

          return (
            <path
              key={getKey(dataItem)}
              d={(ribbon(chord as unknown as Ribbon) as unknown as string | null) || ''}
              fill={`${lineColor(dataItem)}66`}
              className="hover:opacity-70"
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
