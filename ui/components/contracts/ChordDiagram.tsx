import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Ribbon } from 'd3-chord';
import { chordDirected as d3Chord, ribbon as d3Ribbon } from 'd3-chord';
import type { DefaultArcObject } from 'd3-shape';
import { arc as d3Arc } from 'd3-shape';
import { byNum } from 'sort-lib';
import { identity } from 'rambda';
import { twJoin } from 'tailwind-merge';

export const defaultDisplay = {
  arcTickness: 15,
  gapBetweenChordsRadians: 0.03,
  labelWidth: 300,
};

// eslint-disable-next-line @typescript-eslint/ban-types
const constructMatrix = <T extends {}>(
  data: T[],
  hasConnections: (d: T) => boolean,
  getParents: (d: T) => T[],
  weight: (from: T, to: T) => number
) => {
  const matrix: number[][] = [];
  data.filter(hasConnections).forEach((dataItem, i) => {
    const related = getParents(dataItem);
    const row = Array.from({ length: data.length }).fill(0) as number[];
    related.forEach(r => {
      const j = data.indexOf(r);
      row[j] = weight(dataItem, r);
    });
    matrix[i] = row;
  });
  return matrix;
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
type ChordDiagramHoveredItem<T extends unknown> =
  | {
      type: 'chord';
      item: T;
    }
  | {
      type: 'ribbon';
      source: T;
      target: T;
    };

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const useHoveredItem = <T extends unknown>(getRelated: (x: T) => T[]) => {
  const [hoveredItem, setHoveredItem] = useState<
    ChordDiagramHoveredItem<T> | undefined
  >();

  const mouseHandlers = useCallback(
    (item: ChordDiagramHoveredItem<T>) => ({
      onMouseOver: () => setHoveredItem(item),
      // eslint-disable-next-line unicorn/no-useless-undefined
      onMouseOut: () => setHoveredItem(undefined),
    }),
    []
  );

  const shouldHighlightChord = useCallback(
    (item: T) => {
      if (!hoveredItem) return true;

      if (hoveredItem.type === 'chord') {
        return hoveredItem.item === item || getRelated(item).includes(hoveredItem.item);
      }

      if (hoveredItem.type === 'ribbon') {
        return hoveredItem.source === item || hoveredItem.target === item;
      }
    },
    [getRelated, hoveredItem]
  );

  const shouldHighlightRibbon = useCallback(
    (item: { source: T; target: T }) => {
      if (!hoveredItem) return true;

      if (hoveredItem.type === 'chord') {
        // return item.source === hoveredItem.item || item.target === hoveredItem.item;
        const related = [item.source, item.target];
        return related.includes(hoveredItem.item);
      }

      if (hoveredItem.type === 'ribbon') {
        return (
          (hoveredItem.source === item.source && hoveredItem.target === item.target) ||
          (hoveredItem.source === item.target && hoveredItem.target === item.source)
        );
      }
    },
    [hoveredItem]
  );

  return {
    shouldHighlightChord,
    shouldHighlightRibbon,
    mouseHandlers,
  };
};

type ChordDiagramProps<T> = {
  data?: T[];
  getParents: (d: T) => T[];
  getChildren: (d: T) => T[];
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
  getParents,
  getChildren,
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
  const { shouldHighlightChord, shouldHighlightRibbon, mouseHandlers } =
    useHoveredItem<T>(x => [...getParents(x), ...getChildren(x)]);

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

    return chord(constructMatrix(data || [], hasConnections, getParents, ribbonWeight));
  }, [data, display.gapBetweenChordsRadians, getParents, hasConnections, ribbonWeight]);

  const outerRadius =
    Math.min(
      svgDimensions.width - display.labelWidth,
      svgDimensions.height - display.labelWidth
    ) * 0.5;
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

          const angle = (group.endAngle + group.startAngle) / 2;

          return (
            <Fragment key={`${getKey(dataItem)}-${group.index}-frag`}>
              <path
                d={arc(group as unknown as DefaultArcObject) || undefined}
                fill={lineColor(dataItem)}
                className={twJoin(
                  'transition-opacity duration-200 ease-in-out',
                  shouldHighlightChord(dataItem) ? '' : 'opacity-20'
                )}
                data-tooltip-id="react-tooltip"
                data-tooltip-html={chordTooltip?.(dataItem)}
                {...mouseHandlers({ type: 'chord', item: dataItem })}
              />
              <g
                transform={`rotate(${
                  (angle * 180) / Math.PI - 90
                }), translate(${outerRadius},0)`}
              >
                <text
                  x="8"
                  dy="0.35em"
                  transform={angle > Math.PI ? 'rotate(180) translate(-16)' : undefined}
                  style={{
                    textAnchor: angle > Math.PI ? 'end' : undefined,
                  }}
                  className={twJoin(
                    'transition-opacity duration-200 ease-in-out',
                    shouldHighlightChord(dataItem) ? '' : 'opacity-20'
                  )}
                  data-tooltip-id="react-tooltip"
                  data-tooltip-html={chordTooltip?.(dataItem)}
                  {...mouseHandlers({ type: 'chord', item: dataItem })}
                >
                  {getTitle(dataItem)}
                </text>
              </g>
            </Fragment>
          );
        })}

        {chords.map((chord, chordIndex) => {
          const sourceDataItem = data?.at(chord.source.index);
          const targetDataItem = data?.at(chord.target.index);

          if (!sourceDataItem || !targetDataItem) return null;

          try {
            // TODO: For some reason, this could throw a 'negative radius' error
            // when the component re-renders, such as HMR or when navigating back to page
            const ribbonPath = ribbon(chord as unknown as Ribbon) as unknown as
              | string
              | null;

            return (
              <path
                // eslint-disable-next-line react/no-array-index-key
                key={`${
                  getKey(sourceDataItem) + getKey(targetDataItem)
                }-${chordIndex}path`}
                d={ribbonPath || ''}
                fill={`${lineColor(targetDataItem)}66`}
                className={twJoin(
                  'transition-opacity duration-200 ease-in-out',
                  shouldHighlightRibbon({
                    source: sourceDataItem,
                    target: targetDataItem,
                  })
                    ? ''
                    : 'opacity-20'
                )}
                data-tooltip-id="react-tooltip"
                data-tooltip-html={ribbonTooltip?.(targetDataItem, sourceDataItem)}
                {...mouseHandlers({
                  type: 'ribbon',
                  source: sourceDataItem,
                  target: targetDataItem,
                })}
              />
            );
          } catch {
            return null;
          }
        })}
      </g>
    </svg>
  );
};

export default ChordDiagram;
