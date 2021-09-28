import { range } from 'rambda';
import React, { Fragment } from 'react';
import Loading from '../Loading';

const yAxisItemSpacing = 35;
const yAxisLeftPadding = 100;
const height = 500;
const xAxisBottomPadding = 130;
const xAxisLabelHeight = 30;
const xAxisLabelWidth = 200;
const axisOverhang = 10;
const numberOfHorizontalGridLines = 3;
const numberOfVerticalGridLines = 5;
const legendItemsPerLine = 3;
const legendItemHeight = 20;
const legendItemPaddingTop = 10;

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

type LegendProps<Line> = {
  lineColor: (line: Line) => string;
  lines: Line[];
  lineLabel: (line: Line) => string;
  width: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Legend = <Line extends any>({
  lineColor, lines, lineLabel, width
}: LegendProps<Line>) => (
  <g>
    {lines.map((line, i) => (
      <foreignObject
        key={lineLabel(line)}
        x={(
          ((width - yAxisLeftPadding) / legendItemsPerLine)
            * (i % legendItemsPerLine)
        ) + yAxisLeftPadding}
        y={
          (height - xAxisBottomPadding + xAxisLabelHeight)
          + (Math.floor(i / legendItemsPerLine) * (legendItemHeight + legendItemPaddingTop))
          + legendItemPaddingTop
        }
        width={300}
        height={legendItemHeight}
      >
        <div className="flex align-middle text-gray-600 text-sm">
          <span
            className="inline-block mr-2 w-7 h-5"
            style={{ backgroundColor: lineColor(line) }}
          />
          {lineLabel(line)}
        </div>
      </foreignObject>
    ))}
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
              stroke="#ddd"
              strokeWidth={1}
            />
            <foreignObject
              x={0}
              y={yCoord(gridLinesGap * i) - yAxisItemSpacing / 2}
              width={yAxisLeftPadding - axisOverhang}
              height={yAxisItemSpacing}
            >
              <div className="flex text-gray-400 justify-end text-sm w-full h-8 items-center">
                {yAxisLabel(i * gridLinesGap)}
              </div>
            </foreignObject>
          </Fragment>
        ))}
      </g>
      <g>
        {range(1, numberOfVerticalGridLines).map(i => (
          <Fragment key={i}>
            <line
              x1={yAxisLeftPadding + ((i * (width - yAxisLeftPadding)) / numberOfVerticalGridLines)}
              y1={0}
              x2={yAxisLeftPadding + ((i * (width - yAxisLeftPadding)) / numberOfVerticalGridLines)}
              y2={(height - xAxisBottomPadding)}
              stroke="#ddd"
              strokeWidth={1}
            />
            <foreignObject
              x={yAxisLeftPadding + ((i * (width - yAxisLeftPadding)) / numberOfVerticalGridLines) - (xAxisLabelWidth / 2)}
              y={height - xAxisBottomPadding + (axisOverhang / 2)}
              width={xAxisLabelWidth}
              height={xAxisLabelHeight}
            >
              <div className="flex text-gray-400 justify-center text-sm w-full items-center">
                {xAxisLabel(points[i * (points.length / (numberOfVerticalGridLines + 1))])}
              </div>
            </foreignObject>
          </Fragment>
        ))}
      </g>
    </>
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
  const width = (points(lines[0]).length) * yAxisItemSpacing;
  const yAxisMax = Math.max(...lines.map(line => Math.max(...points(line).map(pointToValue))));

  if (!yAxisMax) return <Loading />;

  const xCoord = (index: number) => (
    (index * yAxisItemSpacing) + yAxisLeftPadding
  );
  const yCoord = (value: number) => (
    height - ((value / yAxisMax) * (height - xAxisBottomPadding)) - xAxisBottomPadding
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
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
      <Legend lineColor={lineColor} lines={lines} lineLabel={lineLabel} width={width} />
    </svg>
  );
};

export default LineGraph;
