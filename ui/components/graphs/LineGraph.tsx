import { range } from 'rambda';
import React, { Fragment } from 'react';
import Loading from '../Loading';

const yAxisItemSpacing = 35;
const yAxisLeftPadding = 100;
const height = 500;
const xAxisBottomPadding = 100;
const axisOverhang = 10;
const numberOfGridLines = 3;
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
          (height - xAxisBottomPadding)
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

type GridLinesProps = {
  yAxisMax: number;
  yCoord: (value: number) => number;
  width: number;
  yAxisLabel: (value: number) => string;
};

const GridLines: React.FC<GridLinesProps> = ({
  yAxisMax, yCoord, width, yAxisLabel
}) => {
  const gridLinesGap = Math.round(yAxisMax / (numberOfGridLines + 1));
  return (
    <g>
      {range(1, numberOfGridLines + 1).map(i => (
        <Fragment key={i}>
          <line
            key={i}
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
  );
};

type LineGraphProps<Line, Point> = {
  lines: Line[];
  points: (line: Line) => Point[];
  pointToValue: (point: Point) => number;
  lineColor: (line: Line) => string;
  yAxisLabel: (value: number) => string;
  lineLabel: (line: Line) => string;
  className?: string;
};

const LineGraph = <L, P>({
  lines, points, pointToValue, className, lineColor, yAxisLabel, lineLabel
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
      <GridLines yAxisMax={yAxisMax} yCoord={yCoord} width={width} yAxisLabel={yAxisLabel} />
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
