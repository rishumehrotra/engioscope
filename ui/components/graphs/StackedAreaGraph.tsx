import { last, range, sum } from 'rambda';
import type { MutableRefObject } from 'react';
import React, { useMemo, useState, useCallback, Fragment, useRef } from 'react';
import useRequestAnimationFrame from '../../hooks/use-request-animation-frame.js';
import useSvgEvent from '../../hooks/use-svg-event.js';
import { exists } from '../../../shared/utils.js';

const yAxisItemSpacing = 60;
const yAxisLeftPadding = 70;
const yAxisLabelHeight = 20;
const height = 300;
const xAxisBottomPadding = 30;
const xAxisLabelHeight = 30;
const xAxisLabelWidth = 100;
const axisOverhang = 0;
const numberOfHorizontalGridLines = 5;
const numberOfVerticalGridLines = 6;
const hoverBubbleWidth = 360;

const hoverBubbleMaxHeight = (height * 2) / 3;

const Axes: React.FC<{ width: number }> = ({ width }) => (
  <g>
    <line
      x1={yAxisLeftPadding}
      y1={0}
      x2={yAxisLeftPadding}
      y2={height - xAxisBottomPadding + axisOverhang}
      stroke="#ddd"
      strokeWidth={1}
    />
    <line
      x1={yAxisLeftPadding - axisOverhang}
      y1={height - xAxisBottomPadding}
      x2={width}
      y2={height - xAxisBottomPadding}
      stroke="#ddd"
      strokeWidth={1}
    />
  </g>
);

type GridLinesProps<Point> = {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  yAxisMax: number;
  yCoord: (value: number) => number;
  width: number;
  yAxisLabel: (value: number) => string;
  xAxisLabel: (point: Point) => string;
  points: Point[];
  closestPointIndex: (xCoord: number) => number;
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const GridLines = <Point extends unknown>({
  svgRef,
  yAxisMax,
  yCoord,
  width,
  yAxisLabel,
  xAxisLabel,
  points,
  closestPointIndex,
}: GridLinesProps<Point>) => {
  const gridLinesGap = Math.ceil(yAxisMax / (numberOfHorizontalGridLines + 1));

  const labelForVerticalGridline = useMemo(() => {
    const svgDimensions = svgRef.current?.getBoundingClientRect();
    return (gridLineIndex: number) => {
      if (!svgDimensions) return;
      return xAxisLabel(
        points[
          closestPointIndex(
            (gridLineIndex *
              (svgDimensions.width - (yAxisLeftPadding * svgDimensions.width) / width)) /
              (numberOfVerticalGridLines - 1)
          )
        ]
      );
    };
  }, [closestPointIndex, points, svgRef, width, xAxisLabel]);

  return (
    <>
      <g>
        {range(1, numberOfHorizontalGridLines + 1).map(i => (
          <Fragment key={i}>
            <line
              x1={yAxisLeftPadding}
              y1={yCoord(gridLinesGap * i)}
              x2={width}
              y2={yCoord(gridLinesGap * i)}
              stroke="#f6f6f6"
              strokeWidth={1}
            />
            <foreignObject
              x={0}
              y={yCoord(gridLinesGap * i)}
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
        {range(1, numberOfVerticalGridLines + 1).map(i => (
          <Fragment key={i}>
            {i === numberOfVerticalGridLines ? null : (
              <foreignObject
                x={
                  yAxisLeftPadding +
                  (i * (width - yAxisLeftPadding)) / numberOfVerticalGridLines -
                  xAxisLabelWidth / 2
                }
                y={height - xAxisBottomPadding + axisOverhang / 2}
                width={xAxisLabelWidth}
                height={xAxisLabelHeight}
              >
                <div className="flex text-theme-icon justify-center text-sm w-full items-center">
                  {labelForVerticalGridline(i)}
                </div>
              </foreignObject>
            )}
          </Fragment>
        ))}
      </g>
    </>
  );
};

const useCrosshair = (
  svgRef: MutableRefObject<SVGSVGElement | null>,
  crosshairRef: MutableRefObject<SVGGElement | null>,
  width: number,
  closestPointIndex: (xCoord: number) => number,
  xCoord: (index: number) => number
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const crosshairLabel = crosshair.querySelector('div')!;
    const closest = closestPointIndex(hoverXCoord.current);

    crosshair.style.display = '';
    crosshair.style.transform = `translateX(${xCoord(closest)}px)`;
    if (closest !== closestIndex) setClosestIndex(closest);

    const closeToRightEdge = width - xCoord(closest) < hoverBubbleWidth / 2;
    const closeToLeftEdge = xCoord(closest) < hoverBubbleWidth / 2;
    if (closeToRightEdge) {
      // crosshairLabel.style.transformOrigin = 'right';
      crosshairLabel.style.transform = `translateX(${
        width - xCoord(closest) - hoverBubbleWidth / 2
      }px)`;
    } else if (closeToLeftEdge) {
      crosshairLabel.style.transform = `translateX(${
        hoverBubbleWidth / 2 - xCoord(closest)
      }px)`;
    } else {
      crosshairLabel.style.transform = 'translateX(0)';
      crosshairLabel.style.width = `${hoverBubbleWidth}px`;
    }
  }, [svgRef, crosshairRef, width, closestPointIndex, xCoord, closestIndex]);
  useRequestAnimationFrame(repositionCrosshair);

  const mouseMove = useCallback(
    (e: MouseEvent) => {
      if (!svgRef.current) {
        hoverXCoord.current = null;
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const mappedPosition = (width / rect.width) * e.offsetX;
      hoverXCoord.current = mappedPosition < yAxisLeftPadding ? null : mappedPosition;
    },
    [svgRef, width]
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
  width: number;
  closestPointIndex: (xCoord: number) => number;
  xCoord: (index: number) => number;
  contents: (pointIndex: number) => React.ReactNode;
  crosshairWidth: number;
};

const VerticalCrosshair: React.FC<VerticalCrosshairProps> = ({
  svgRef,
  width,
  closestPointIndex,
  xCoord,
  contents,
  crosshairWidth,
}) => {
  const crosshairRef = useRef<SVGGElement | null>(null);
  const renderIndex = useCrosshair(
    svgRef,
    crosshairRef,
    width,
    closestPointIndex,
    xCoord
  );

  return (
    <g ref={crosshairRef} className="pointer-events-none" style={{ display: 'none' }}>
      <rect
        x={-1 * (crosshairWidth / 2)}
        y={0}
        width={crosshairWidth}
        height={height - xAxisBottomPadding}
        fill="rgba(51, 170, 250, 0.2)"
      />
      <foreignObject
        x={-1 * (hoverBubbleWidth / 2)}
        y={0}
        width={hoverBubbleWidth}
        height={hoverBubbleMaxHeight}
        overflow="visible"
      >
        {/* This div is needed for the useCrosshair hook */}
        <div>{renderIndex === null ? null : contents(renderIndex)}</div>
      </foreignObject>
    </g>
  );
};

export type StackedAreaGraphProps<Line, Point> = {
  lines: Line[];
  points: (line: Line) => Point[];
  pointToValue: (point: Point) => number;
  lineColor: (line: Line) => string;
  yAxisLabel: (value: number) => string;
  // lineLabel: (line: Line) => string;
  xAxisLabel: (point: Point) => string;
  crosshairBubble?: (pointIndex: number) => React.ReactNode;
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
  // lineLabel,
  xAxisLabel,
  crosshairBubble = () => null,
  onClick,
}: StackedAreaGraphProps<L, P>) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const yAxisMax = lines[0]
    ? Math.max(
        ...range(0, points(lines[0]).length).map(weekIndex => {
          return sum(lines.map(line => pointToValue(points(line)[weekIndex])));
        })
      )
    : 0;

  const xCoord = useCallback(
    (index: number) => index * yAxisItemSpacing + yAxisLeftPadding,
    []
  );

  const yCoord = useCallback(
    (value: number) =>
      height - (value / yAxisMax) * (height - xAxisBottomPadding) - xAxisBottomPadding,
    [yAxisMax]
  );

  const closestPointIndex = useCallback(
    (xCoord: number) => Math.round((xCoord - yAxisLeftPadding) / yAxisItemSpacing),
    []
  );

  const width =
    lines.length === 0
      ? 0
      : (points(lines[0]).length - 1) * yAxisItemSpacing + yAxisLeftPadding;

  const onSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onClick) return;
      const svgDimensions = svgRef.current?.getBoundingClientRect();
      if (!svgDimensions) return;
      const index = closestPointIndex(
        (e.nativeEvent.offsetX / svgDimensions.width) * width
      );
      if (index !== null && index >= 0) onClick(index);
    },
    [closestPointIndex, onClick, width]
  );

  const polygons = useMemo(() => {
    const stackedLines = lines
      .map(line => points(line).map(pointToValue))
      .reduce<number[][]>(
        (acc, points) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const previousLine = last(acc)!;
          acc.push(points.map((point, pointIndex) => point + previousLine[pointIndex]));
          return acc;
        },
        lines[0]
          ? [Array.from({ length: points(lines[0]).length }).fill(0) as number[]]
          : []
      );

    const toPoint = (point: number, index: number) => {
      return [xCoord(index), yCoord(point)].join(',');
    };

    return stackedLines
      .flatMap((line, index) => {
        if (index === 0) return null;

        const previousLine = stackedLines[index - 1];
        return [
          <polygon
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            points={[...line.map(toPoint), ...previousLine.map(toPoint).reverse()].join(
              ' '
            )}
            fill={lineColor(lines[index - 1])}
            className="opacity-25"
          />,
          <path
            // eslint-disable-next-line react/no-array-index-key
            key={`${index}path`}
            d={line
              .map(
                (point, pointIndex) =>
                  `${pointIndex === 0 ? 'M' : 'L'} ${xCoord(pointIndex)} ${yCoord(point)}`
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
  }, [lineColor, lines, pointToValue, points, xCoord, yCoord]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      ref={svgRef}
      onClick={onSvgClick}
    >
      <Axes width={width} />
      <GridLines
        svgRef={svgRef}
        yAxisMax={yAxisMax}
        yCoord={yCoord}
        width={width}
        yAxisLabel={yAxisLabel}
        xAxisLabel={xAxisLabel}
        points={points(lines[0])}
        closestPointIndex={closestPointIndex}
      />
      {polygons}
      <VerticalCrosshair
        svgRef={svgRef}
        width={width}
        xCoord={xCoord}
        crosshairWidth={yAxisItemSpacing}
        closestPointIndex={closestPointIndex}
        contents={crosshairBubble}
      />
    </svg>
  );
};

export default StackedAreaGraph;
