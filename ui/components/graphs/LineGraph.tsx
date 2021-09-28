import { range } from 'rambda';
import type { MutableRefObject } from 'react';
import React, { useCallback, Fragment, useRef } from 'react';
import useRequestAnimationFrame from '../../hooks/use-request-animation-frame';
import useSvgEvent from '../../hooks/use-svg-event';
import Loading from '../Loading';

const yAxisItemSpacing = 35;
const yAxisLeftPadding = 70;
const height = 600;
const xAxisBottomPadding = 30;
const xAxisLabelHeight = 30;
const xAxisLabelWidth = 100;
const axisOverhang = 10;
const numberOfHorizontalGridLines = 10;
const numberOfVerticalGridLines = 6;

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
  yAxisMax: number;
  yCoord: (value: number) => number;
  width: number;
  yAxisLabel: (value: number) => string;
  xAxisLabel: (point: Point) => string;
  points: Point[];
};

const GridLines = <Point extends unknown>({
  yAxisMax, yCoord, width, yAxisLabel, xAxisLabel, points
}: GridLinesProps<Point>) => {
  const gridLinesGap = Math.round(yAxisMax / (numberOfHorizontalGridLines + 1));
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
              stroke="#e9e9e9"
              strokeWidth={1}
            />
            <foreignObject
              x={0}
              y={yCoord(gridLinesGap * i) - yAxisItemSpacing / 2}
              width={yAxisLeftPadding - axisOverhang}
              height={yAxisItemSpacing}
            >
              <div className="flex text-gray-500 justify-end text-sm w-full h-8 items-center">
                {yAxisLabel(i * gridLinesGap)}
              </div>
            </foreignObject>
          </Fragment>
        ))}
      </g>
      <g>
        {range(1, numberOfVerticalGridLines + 1).map(i => (
          <Fragment key={i}>
            <line
              x1={yAxisLeftPadding + ((i * (width - yAxisLeftPadding)) / numberOfVerticalGridLines)}
              y1={0}
              x2={yAxisLeftPadding + ((i * (width - yAxisLeftPadding)) / numberOfVerticalGridLines)}
              y2={(height - xAxisBottomPadding)}
              stroke="#e9e9e9"
              strokeWidth={i === numberOfVerticalGridLines ? 3 : 1}
            />
            {i === numberOfVerticalGridLines
              ? null
              : (
                <foreignObject
                  x={yAxisLeftPadding + ((i * (width - yAxisLeftPadding)) / numberOfVerticalGridLines) - (xAxisLabelWidth / 2)}
                  y={height - xAxisBottomPadding + (axisOverhang / 2)}
                  width={xAxisLabelWidth}
                  height={xAxisLabelHeight}
                >
                  <div className="flex text-gray-500 justify-center text-sm w-full items-center">
                    {xAxisLabel(points[Math.round(i * (points.length / (numberOfVerticalGridLines + 1)))])}
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
  width: number
) => {
  const hoverXCoord = useRef<number | null>(null);
  const prevHoverXCoord = useRef<number | null>(null);

  const repositionCrosshair = useCallback(() => {
    if (hoverXCoord.current === prevHoverXCoord.current) return;

    const svg = svgRef.current;
    const crosshair = crosshairRef.current;
    if (!svg || !crosshair) return;

    prevHoverXCoord.current = hoverXCoord.current;

    if (!hoverXCoord.current || hoverXCoord.current < xAxisLabelWidth / 2) {
      crosshair.style.display = 'none';
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const crosshairLabel = crosshair.querySelector('div')!;

    crosshair.style.display = '';
    crosshair.style.transform = `translateX(${hoverXCoord.current}px)`;
    crosshairLabel.innerHTML = '';

    const closeToRightEdge = width - hoverXCoord.current < xAxisLabelWidth / 2;
    if (closeToRightEdge) {
      crosshairLabel.style.transformOrigin = 'right';
      crosshairLabel.style.transform = (
        `translateX(${(width - hoverXCoord.current - xAxisLabelWidth / 2)}px)`
      );
      crosshairLabel.style.textAlign = 'right';
    } else {
      crosshairLabel.style.transform = 'translateX(0)';
      crosshairLabel.style.textAlign = 'center';
      crosshairLabel.style.width = `${xAxisLabelWidth}px`;
    }
  }, [svgRef, crosshairRef, width]);
  useRequestAnimationFrame(repositionCrosshair);

  const mouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current) {
      hoverXCoord.current = null;
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const mappedPosition = (width / rect.width) * e.offsetX;
    hoverXCoord.current = mappedPosition < xAxisLabelWidth ? null : mappedPosition;
  }, [svgRef, width]);
  useSvgEvent(svgRef, 'mousemove', mouseMove);

  const mouseLeave = useCallback(() => { hoverXCoord.current = null; }, []);
  useSvgEvent(svgRef, 'mouseleave', mouseLeave);
};

type VerticalCrosshairProps = {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  width: number;
};

const VerticalCrosshair = ({ svgRef, width }: VerticalCrosshairProps) => {
  const crosshairRef = useRef<SVGGElement | null>(null);
  useCrosshair(svgRef, crosshairRef, width);

  return (
    <g ref={crosshairRef} style={{ display: 'none' }}>
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={height - xAxisBottomPadding}
        className="pointer-events-none"
        stroke="#999"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
      <foreignObject
        x={-1 * (xAxisLabelWidth / 2)}
        y={height - xAxisLabelHeight + axisOverhang}
        width={xAxisLabelWidth}
        height={xAxisLabelHeight}
        overflow="visible"
      >
        <div className="text-xs text-gray-500 text-center bg-white">
          date
        </div>
      </foreignObject>
    </g>

  );
};

type LineGraphProps<Line, Point> = {
  lines: Line[];
  points: (line: Line) => Point[];
  pointToValue: (point: Point) => number;
  lineColor: (line: Line) => string;
  yAxisLabel: (value: number) => string;
  lineLabel: (line: Line) => string;
  xAxisLabel: (point: Point) => string;
  className?: string;
};

const LineGraph = <L, P>({
  lines, points, pointToValue, className, lineColor,
  yAxisLabel, lineLabel, xAxisLabel
}: LineGraphProps<L, P>) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = (points(lines[0]).length) * yAxisItemSpacing;
  const yAxisMax = Math.max(...lines.map(line => Math.max(...points(line).map(pointToValue))));

  const xCoord = useCallback((index: number) => (
    (index * yAxisItemSpacing) + yAxisLeftPadding
  ), []);

  const yCoord = useCallback((value: number) => (
    height - ((value / yAxisMax) * (height - xAxisBottomPadding)) - xAxisBottomPadding
  ), [yAxisMax]);

  if (!yAxisMax) return <Loading />;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      ref={svgRef}
    >
      <Axes width={width} />
      <GridLines
        yAxisMax={yAxisMax}
        yCoord={yCoord}
        width={width}
        yAxisLabel={yAxisLabel}
        xAxisLabel={xAxisLabel}
        points={points(lines[0])}
      />
      {lines.map(line => (
        <path
          key={lineLabel(line)}
          d={points(line).map((point, pointIndex) => (
            `${pointIndex === 0 ? 'M' : 'L'} ${xCoord(pointIndex)} ${yCoord(pointToValue(point))}`
          )).join(' ')}
          fill="none"
          stroke={lineColor(line)}
          strokeWidth={5}
          strokeLinejoin="round"
        />
      ))}
      <VerticalCrosshair svgRef={svgRef} width={width} />
      {/* <Legend lineColor={lineColor} lines={lines} lineLabel={lineLabel} width={width} /> */}
    </svg>
  );
};

export default LineGraph;
