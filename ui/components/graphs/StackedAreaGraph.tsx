import { last, range, sum } from 'rambda';
import type { MutableRefObject } from 'react';
import React, {
  useMemo,
  useState,
  useCallback,
  Fragment,
  useRef,
  useLayoutEffect,
} from 'react';
import useRequestAnimationFrame from '../../hooks/use-request-animation-frame.js';
import useSvgEvent from '../../hooks/use-svg-event.js';
import { divide, exists } from '../../../shared/utils.js';

const yAxisLeftPadding = 70;
const yAxisLabelHeight = 20;
const xAxisBottomPadding = 30;
const xAxisLabelHeight = 30;
const xAxisLabelWidth = 60;
const axisOverhang = 0;
const numberOfHorizontalGridLines = 5;
const numberOfVerticalGridLines = 6;

const useGraphProperties = <L, P>({
  lines,
  points,
  pointToValue,
  svgRef,
}: {
  lines: L[];
  points: (x: L) => P[];
  pointToValue: (x: P) => number;
  svgRef: MutableRefObject<SVGSVGElement | null>;
}) => {
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  useLayoutEffect(
    () =>
      setSvgDimensions(
        svgRef.current?.getBoundingClientRect() || { width: 0, height: 0 }
      ),
    [svgRef]
  );

  const { width, height } = svgDimensions;

  const pointsHorizontalCount = lines[0] ? points(lines[0]).length : 0;

  const yAxisMax = lines[0]
    ? Math.max(
        ...range(0, pointsHorizontalCount).map(weekIndex => {
          return sum(lines.map(line => pointToValue(points(line)[weekIndex])));
        })
      )
    : 0;

  const numXAxisPoints = lines[0] ? points(lines[0]).length : 0;
  const xAxisItemSpacing = divide(width - yAxisLeftPadding, numXAxisPoints - 1).getOr(0);

  const xCoord = (index: number) => index * xAxisItemSpacing + yAxisLeftPadding;
  const yCoord = (value: number) =>
    height - (value / yAxisMax) * (height - xAxisBottomPadding) - xAxisBottomPadding;
  const closestPointIndex = (xCoord: number) =>
    Math.round((xCoord - yAxisLeftPadding) / xAxisItemSpacing);

  const toPoint = (value: number, index: number) => {
    return [xCoord(index), yCoord(value)].join(',');
  };

  return {
    xCoord,
    yCoord,
    xAxisItemSpacing,
    closestPointIndex,
    toPoint,
    yAxisMax,
    width,
    height,
  };
};

type GraphProperties = ReturnType<typeof useGraphProperties>;

const Axes: React.FC<{ graphProperties: GraphProperties }> = ({ graphProperties }) => (
  <g>
    <line
      x1={yAxisLeftPadding}
      y1={0}
      x2={yAxisLeftPadding}
      y2={graphProperties.height - xAxisBottomPadding + axisOverhang}
      stroke="#ddd"
      strokeWidth={1}
    />
    <line
      x1={yAxisLeftPadding - axisOverhang}
      y1={graphProperties.height - xAxisBottomPadding}
      x2={graphProperties.width}
      y2={graphProperties.height - xAxisBottomPadding}
      stroke="#ddd"
      strokeWidth={1}
    />
  </g>
);

type GridLinesProps<Point> = {
  graphProperties: GraphProperties;
  yAxisLabel: (value: number) => string;
  xAxisLabel: (point: Point) => string;
  points: Point[];
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const GridLines = <Point extends unknown>({
  graphProperties,
  yAxisLabel,
  xAxisLabel,
  points,
}: GridLinesProps<Point>) => {
  const gridLinesGap = Math.ceil(
    graphProperties.yAxisMax / (numberOfHorizontalGridLines + 1)
  );

  const labelForVerticalGridline = useMemo(() => {
    return (xPoint: number) => {
      return xAxisLabel(points[graphProperties.closestPointIndex(xPoint)]);
    };
  }, [graphProperties, points, xAxisLabel]);

  return (
    <>
      <g>
        {range(1, numberOfHorizontalGridLines + 1).map(i => (
          <Fragment key={i}>
            <line
              x1={yAxisLeftPadding}
              y1={graphProperties.yCoord(gridLinesGap * i)}
              x2={graphProperties.width}
              y2={graphProperties.yCoord(gridLinesGap * i)}
              stroke="#f6f6f6"
              strokeWidth={1}
            />
            <foreignObject
              x={0}
              y={graphProperties.yCoord(gridLinesGap * i)}
              width={yAxisLeftPadding - axisOverhang}
              height={yAxisLabelHeight}
            >
              <div className="text-theme-icon text-sm w-full h-12 text-right pr-2">
                {yAxisLabel(i * gridLinesGap)}
              </div>
            </foreignObject>
          </Fragment>
        ))}
      </g>
      <g>
        {range(1, numberOfVerticalGridLines + 1).map(i => {
          const xPoint = graphProperties.xCoord(i * 2 - 1);

          return (
            <Fragment key={i}>
              {i === numberOfVerticalGridLines ? null : (
                <foreignObject
                  x={xPoint - xAxisLabelWidth / 2}
                  y={graphProperties.height - xAxisBottomPadding + axisOverhang / 2}
                  width={xAxisLabelWidth}
                  height={xAxisLabelHeight}
                >
                  <div className="text-theme-icon text-sm text-center">
                    {labelForVerticalGridline(xPoint)}
                  </div>
                </foreignObject>
              )}
            </Fragment>
          );
        })}
      </g>
    </>
  );
};

const useCrosshair = (
  svgRef: MutableRefObject<SVGSVGElement | null>,
  crosshairRef: MutableRefObject<SVGGElement | null>,
  graphProperties: GraphProperties
) => {
  const hoverXCoord = useRef<number | null>(null);
  const prevHoverXCoord = useRef<number | null>(null);
  const [closestIndex, setClosestIndex] = useState<number | null>(null);

  const repositionCrosshair = useCallback(() => {
    if (hoverXCoord.current === prevHoverXCoord.current) return;

    const svg = svgRef.current;
    const crosshair = crosshairRef.current;
    if (!svg || !crosshair) return;

    prevHoverXCoord.current = hoverXCoord.current;

    if (!hoverXCoord.current || hoverXCoord.current < yAxisLeftPadding) {
      svg.style.cursor = 'default';
      crosshair.style.display = 'none';
      return;
    }

    svg.style.cursor = 'pointer';

    // const crosshairLabel = crosshair.querySelector('div')!;
    const closest = graphProperties.closestPointIndex(hoverXCoord.current);

    crosshair.style.display = '';
    crosshair.style.transform = `translateX(${graphProperties.xCoord(closest)}px)`;
    if (closest !== closestIndex) setClosestIndex(closest);
  }, [svgRef, crosshairRef, graphProperties, closestIndex]);
  useRequestAnimationFrame(repositionCrosshair);

  const mouseMove = useCallback(
    (e: MouseEvent) => {
      if (!svgRef.current) {
        hoverXCoord.current = null;
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const mappedPosition = (graphProperties.width / rect.width) * e.offsetX;
      hoverXCoord.current = mappedPosition < yAxisLeftPadding ? null : mappedPosition;
    },
    [graphProperties.width, svgRef]
  );
  useSvgEvent(svgRef, 'mousemove', mouseMove);

  const mouseLeave = useCallback(() => {
    hoverXCoord.current = null;
  }, []);
  useSvgEvent(svgRef, 'mouseleave', mouseLeave);

  return closestIndex;
};

type VerticalCrosshairProps = {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  graphProperties: GraphProperties;
  contents: (pointIndex: number) => React.ReactNode;
};

const VerticalCrosshair: React.FC<VerticalCrosshairProps> = ({
  svgRef,
  graphProperties,
  contents,
}) => {
  const crosshairRef = useRef<SVGGElement | null>(null);
  const renderIndex = useCrosshair(svgRef, crosshairRef, graphProperties);

  return (
    <g ref={crosshairRef} style={{ display: 'none' }}>
      <rect
        x={-1 * (graphProperties.xAxisItemSpacing / 2)}
        y={0}
        width={graphProperties.xAxisItemSpacing}
        height={graphProperties.height - xAxisBottomPadding}
        fill="transparent"
        data-tooltip-id="react-tooltip"
        data-tooltip-html={renderIndex === null ? '' : contents(renderIndex)}
        data-tooltip-float="true"
      />
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={graphProperties.height - xAxisBottomPadding}
        stroke="rgba(0,0,0,0.07)"
        className="pointer-events-none"
      />
    </g>
  );
};

export type StackedAreaGraphProps<Line, Point> = {
  lines: Line[];
  points: (line: Line) => Point[];
  pointToValue: (point: Point) => number;
  lineColor: (line: Line) => string;
  yAxisLabel: (value: number) => string;
  lineLabel: (line: Line) => string;
  xAxisLabel: (point: Point) => string;
  crosshairBubble?: (pointIndex: number) => string | null;
  className?: string;
  onClick?: (pointIndex: number) => void;
};

const StackedAreaGraph = <L, P>({
  lines,
  points,
  pointToValue,
  className,
  lineColor,
  yAxisLabel,
  lineLabel,
  xAxisLabel,
  crosshairBubble = () => null,
  onClick,
}: StackedAreaGraphProps<L, P>) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const graphProperties = useGraphProperties({
    lines,
    points,
    pointToValue,
    svgRef,
  });

  const onSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onClick) return;
      const svgDimensions = svgRef.current?.getBoundingClientRect();
      if (!svgDimensions) return;
      const index = graphProperties.closestPointIndex(
        (e.nativeEvent.offsetX / svgDimensions.width) * svgDimensions.width
      );
      if (index !== null && index >= 0) onClick(index);
    },
    [graphProperties, onClick]
  );

  const polygons = useMemo(() => {
    const stackedLines = lines
      .map(line => ({ value: points(line).map(pointToValue), line }))
      .reduce<{ line: L; value: number[] }[]>(
        (acc, points) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const previousLine = last(acc)!;
          acc.push({
            line: points.line,
            value: points.value.map(
              (point, pointIndex) => point + previousLine.value[pointIndex]
            ),
          });
          return acc;
        },
        lines[0]
          ? [
              {
                line: null as L,
                value: Array.from({ length: points(lines[0]).length }).fill(
                  0
                ) as number[],
              },
            ]
          : []
      );

    return stackedLines
      .flatMap((line, index) => {
        if (index === 0) return null;

        const previousLine = stackedLines[index - 1];
        return [
          <polygon
            key={`${lineLabel(line.line)}-area`}
            points={[
              ...line.value.map(graphProperties.toPoint),
              ...previousLine.value.map(graphProperties.toPoint).reverse(),
            ].join(' ')}
            fill={lineColor(lines[index - 1])}
            className="opacity-[0.15]"
          />,
          <path
            key={`${lineLabel(line.line)}-path`}
            d={line.value
              .map((point, pointIndex) =>
                [
                  pointIndex === 0 ? 'M' : 'L',
                  graphProperties.xCoord(pointIndex),
                  graphProperties.yCoord(point),
                ].join(' ')
              )
              .join(' ')}
            fill="none"
            stroke={lineColor(lines[index - 1])}
            strokeWidth={1}
            strokeLinejoin="round"
          />,
        ];
      })
      .filter(exists);
  }, [graphProperties, lineColor, lineLabel, lines, pointToValue, points]);

  return (
    <svg
      viewBox={`0 0 ${graphProperties.width} ${graphProperties.height}`}
      className={className}
      ref={svgRef}
      onClick={onSvgClick}
    >
      <Axes graphProperties={graphProperties} />
      <GridLines
        graphProperties={graphProperties}
        yAxisLabel={yAxisLabel}
        xAxisLabel={xAxisLabel}
        points={points(lines[0])}
      />
      {polygons}
      <VerticalCrosshair
        svgRef={svgRef}
        graphProperties={graphProperties}
        contents={crosshairBubble}
      />
    </svg>
  );
};

export default StackedAreaGraph;
