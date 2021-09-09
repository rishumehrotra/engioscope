/* eslint-disable @typescript-eslint/ban-types */
import prettyMilliseconds from 'pretty-ms';
import { add, map, range } from 'rambda';
import React, { useCallback, useMemo } from 'react';

const xAxisLabelAreaHeight = 100;
const xAxisLabelHeight = 50;
const xAxisLabelWidth = 100;
const yAxisLabelWidth = 50;
const graphHeight = 400;
const scatterWidth = 40;
const groupSpacing = 120;
const barSpacingInGroup = 80;
const labelOverhang = 10;
const bubbleSize = 5;
const gradationsCount = 4;
const yAxisLabelHeight = 20;
const graphTopPadding = bubbleSize;

type GraphData<T> = Record<string, T[]>;
type Group<T> = {
  label: string;
  data: GraphData<T>;
  yAxisPoint: (value: T) => number;
  tooltip: (value: T) => string;
};

const valuesUsing = <T extends {}>(graphData: Group<T>[]) => (
  graphData.flatMap(({ data, yAxisPoint }) => Object.values(data).flatMap(map(yAxisPoint)))
);

const graphWidth = <T extends {}>(groups: Group<T>[]) => (
  Object.values(groups)
    .map(x => Object.values(x.data).length * barSpacingInGroup)
    .reduce((acc, curr) => acc + curr + groupSpacing, 0)
  + yAxisLabelWidth - groupSpacing - (groupSpacing / 2) + (barSpacingInGroup / 2)
);

const randomMap = new WeakMap();
// Prevents shifting of data on re-render
const getRandom = <T extends {}>(x: T) => {
  if (!randomMap.has(x)) {
    randomMap.set(x, Math.random());
  }
  return randomMap.get(x);
};

type BarProps<T extends {}> = {
  items: T[];
  yAxisPoint: (x: T) => number;
  xCoord: number;
  yCoord: (x: number) => number;
  tooltip: (x: T) => string;
  label: string;
};

const Bar = <T extends {}>({
  items, yAxisPoint, xCoord, tooltip, yCoord, label
}: BarProps<T>) => (
  <g>
    <foreignObject
      x={xCoord - (xAxisLabelWidth / 2)}
      y={yCoord(0) + graphTopPadding}
      width={xAxisLabelWidth}
      height={xAxisLabelHeight}
    >
      <div className="text-sm text-gray-500 text-center">
        {label}
      </div>
    </foreignObject>
    {items.map((item, index) => (
      <circle
        key={index}
        cx={(getRandom(item) * scatterWidth) + xCoord - (scatterWidth / 2)}
        cy={yCoord(yAxisPoint(item))}
        r={bubbleSize}
        fill="rgba(0,0,0,0.6)"
        data-html
        data-tip={tooltip(item)}
      />
    ))}
    <line
      x1={xCoord - scatterWidth}
      y1={yCoord(items.map(yAxisPoint).reduce(add, 0) / items.length)}
      x2={xCoord + scatterWidth}
      y2={yCoord(items.map(yAxisPoint).reduce(add, 0) / items.length)}
      stroke="rgba(255,0,0,0.6)"
      strokeWidth={5}
      data-tip={`Average ${label.toLowerCase()}: ${
        prettyMilliseconds(items.map(yAxisPoint).reduce(add, 0) / items.length, { compact: true })
      }`}
    />
  </g>
);

type BarGroupProps<T extends {}> = {
  group: Group<T>;
  xCoord: number;
  yCoord: (x: number) => number;
};

const BarGroup = <T extends {}>({
  group, xCoord, yCoord
}: BarGroupProps<T>) => (
  <g>
    {Object.entries(group.data).length > 1
      ? (
        <foreignObject
          x={xCoord - (scatterWidth / 2)}
          y={yCoord(0) + xAxisLabelHeight}
          width={((Object.entries(group.data).length - 1) * (barSpacingInGroup + scatterWidth)) - (barSpacingInGroup / 2)}
          height={xAxisLabelAreaHeight}
        >
          <div className="text-sm text-gray-500 text-center">
            {group.label}
          </div>
        </foreignObject>
      )
      : null}
    {Object.entries(group.data).map(([key, items], index) => (
      <Bar
        key={key}
        items={items}
        label={Object.entries(group.data).length === 1 ? group.label : key}
        yAxisPoint={group.yAxisPoint}
        xCoord={xCoord + (barSpacingInGroup * index)}
        yCoord={yCoord}
        tooltip={group.tooltip}
      />
    ))}
  </g>
);

type AxesProps = {
  width: number;
  maxValue: number;
  yCoord: (x: number) => number;
};

const Axes: React.FC<AxesProps> = ({ width, maxValue, yCoord }) => (
  <>
    <line
      // x axis
      x1={yAxisLabelWidth - labelOverhang}
      y1={graphHeight - xAxisLabelAreaHeight}
      x2={width}
      y2={graphHeight - xAxisLabelAreaHeight}
      stroke="#ddd"
      strokeWidth={1}
    />
    <line
      // y axis
      x1={yAxisLabelWidth}
      y1={0}
      x2={yAxisLabelWidth}
      y2={graphHeight - xAxisLabelAreaHeight + labelOverhang}
      stroke="#ddd"
      strokeWidth={1}
    />
    {range(0, gradationsCount + 1).map(gradationIndex => (
      <>
        <line
          key={gradationIndex}
          x1={yAxisLabelWidth - labelOverhang}
          y1={yCoord((maxValue * (gradationsCount - gradationIndex + 1)) / gradationsCount)}
          x2={width}
          y2={yCoord((maxValue * (gradationsCount - gradationIndex + 1)) / gradationsCount)}
          stroke="#ddd"
          strokeWidth={1}
        />
        <foreignObject
          x={0}
          y={yCoord((maxValue * (gradationsCount - gradationIndex + 1)) / gradationsCount) - (yAxisLabelHeight / 2)}
          width={yAxisLabelWidth}
          height={yAxisLabelHeight}
        >
          <div className="text-right text-sm text-gray-400 pr-3">
            {prettyMilliseconds((maxValue * (gradationsCount - gradationIndex + 1)) / gradationsCount, { compact: true })}
          </div>
        </foreignObject>
      </>
    ))}
  </>
);

type ScatterLineGraphProps<T> = { graphData: Group<T>[]; height: number };

const ScatterLineGraph = <T extends {}>({ graphData, height }: ScatterLineGraphProps<T>): React.ReactElement => {
  const maxOfSpread = useMemo(() => Math.max(...valuesUsing(graphData)), [graphData]);
  const computedWidth = useMemo(() => graphWidth(graphData), [graphData]);
  const yCoord = useCallback((value: number) => {
    const availableHeight = graphHeight - xAxisLabelAreaHeight - graphTopPadding;
    return availableHeight - ((value / maxOfSpread) * availableHeight) + graphTopPadding;
  }, [maxOfSpread]);

  return (
    <svg viewBox={`0 0 ${computedWidth} ${graphHeight}`} height={height}>
      <Axes width={computedWidth} maxValue={maxOfSpread} yCoord={yCoord} />
      {graphData.map((group, index) => (
        <BarGroup
          key={group.label}
          group={group}
          xCoord={(index * groupSpacing) + (groupSpacing / 2) + yAxisLabelWidth}
          yCoord={yCoord}
        />
      ))}
    </svg>
  );
};

export default ScatterLineGraph;
