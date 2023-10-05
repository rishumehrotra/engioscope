import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { Ribbon } from 'd3-chord';
import { chordDirected as d3Chord, ribbon as d3Ribbon } from 'd3-chord';
import type { DefaultArcObject } from 'd3-shape';
import { arc as d3Arc } from 'd3-shape';
import { byNum } from 'sort-lib';
import { identity } from 'rambda';

export const defaultDisplay = {
  arcTickness: 15,
  gapBetweenChordsRadians: 0.03,
  labelDistanceFromArc: 30,
};

// eslint-disable-next-line @typescript-eslint/ban-types
const constructMatrix = <T extends {}>(
  data: T[],
  hasConnections: (d: T) => boolean,
  getRelated: (d: T) => T[],
  weight: (from: T, to: T) => number
) => {
  const matrix: number[][] = [];
  data.filter(hasConnections).forEach((dataItem, i) => {
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
  hasConnections: (d: T) => boolean;
  display?: typeof defaultDisplay;
  lineColor: (x: T) => string;
  ribbonTooltip?: (source: T, target: T) => string | undefined;
  getKey: (x: T) => string;
  getTitle: (x: T) => string;
  ribbonWeight: (from: T, to: T) => number;
  chordTooltip?: (x: T) => string | undefined;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const ChordDiagram = <T extends {}>({
  data,
  getRelated,
  hasConnections,
  display = defaultDisplay,
  lineColor,
  ribbonTooltip,
  getKey,
  getTitle,
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
    const chord = d3Chord()
      .padAngle(display.gapBetweenChordsRadians)
      .sortGroups(byNum(identity))
      .sortSubgroups(byNum(identity))
      .sortChords(byNum(identity));

    return chord(constructMatrix(data || [], hasConnections, getRelated, ribbonWeight));
  }, [data, display.gapBetweenChordsRadians, getRelated, hasConnections, ribbonWeight]);

  const outerRadius =
    Math.min(
      svgDimensions.width - display.labelDistanceFromArc,
      svgDimensions.height - display.labelDistanceFromArc
    ) * 0.5;
  const innerRadius = outerRadius - display.arcTickness;

  const arc = useMemo(
    () => d3Arc().innerRadius(innerRadius).outerRadius(outerRadius),
    [innerRadius, outerRadius]
  );

  const labelArc = useMemo(
    () =>
      d3Arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius + display.labelDistanceFromArc),
    [display.labelDistanceFromArc, innerRadius, outerRadius]
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

          const centeroid = labelArc.centroid(group as unknown as DefaultArcObject);
          const labelPosition = {
            x: centeroid[0] > 0 ? centeroid[0] + 10 : centeroid[0] - 10,
            y: centeroid[1],
            textAnchor: centeroid[0] > 0 ? 'start' : 'end',
          };

          return (
            <Fragment key={`${getKey(dataItem)}-${group.index}-frag`}>
              <path
                d={arc(group as unknown as DefaultArcObject) || undefined}
                fill={lineColor(dataItem)}
                className="hover:opacity-70"
                data-tooltip-id="react-tooltip"
                data-tooltip-html={chordTooltip?.(dataItem)}
              />
              <text
                {...labelPosition}
                data-tooltip-id="react-tooltip"
                data-tooltip-html={chordTooltip?.(dataItem)}
              >
                {getTitle(dataItem)}
              </text>
            </Fragment>
          );
        })}

        {chords.map((chord, chordIndex) => {
          const sourceDataItem = data?.at(chord.source.index);
          const targetDataItem = data?.at(chord.target.index);

          if (!sourceDataItem || !targetDataItem) return null;

          return (
            <path
              // eslint-disable-next-line react/no-array-index-key
              key={`${getKey(sourceDataItem) + getKey(targetDataItem)}-${chordIndex}path`}
              d={(ribbon(chord as unknown as Ribbon) as unknown as string | null) || ''}
              fill={`${lineColor(targetDataItem)}66`}
              className="hover:opacity-70"
              data-tooltip-id="react-tooltip"
              data-tooltip-html={ribbonTooltip?.(targetDataItem, sourceDataItem)}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default ChordDiagram;
