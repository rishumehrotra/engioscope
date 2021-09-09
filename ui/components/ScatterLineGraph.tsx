/* eslint-disable @typescript-eslint/ban-types */
import { map } from 'rambda';
import React, { useCallback, useMemo } from 'react';

const xAxisLabelHeight = 30;
const yAxisLabelWidth = 100;
const graphHeight = 400;
const scatterWidth = 10;
const groupSpacing = 70;
const barSpacingInGroup = 30;
const labelOverhang = 10;

type GraphData<T> = Record<string, T[]>;
type Group<T> = { label: string; data: GraphData<T>; yAxisPoint: (value: T) => number };

const valuesUsing = <T extends {}>(graphData: Group<T>[]) => (
  graphData.flatMap(({ data, yAxisPoint }) => Object.values(data).flatMap(map(yAxisPoint)))
);

const graphWidth = <T extends {}>(groups: Group<T>[]) => (
  (2 * groupSpacing)
  + Object.values(groups)
    .map(x => Object.values(x.data).length * barSpacingInGroup)
    .reduce((acc, curr) => acc + curr + groupSpacing, 0)
);

type BarProps<T extends {}> = {
  items: T[];
  yAxisPoint: (x: T) => number;
  xCoord: number;
  scalingFactor: (x: number) => number;
};

const Bar = <T extends {}>({
  items, yAxisPoint, scalingFactor, xCoord
}: BarProps<T>) => (
  <g>
    {items.map((item, index) => (
      <circle
        key={index}
        cx={(Math.random() * scatterWidth) + xCoord}
        cy={graphHeight - ((scalingFactor(yAxisPoint(item)) * graphHeight) + xAxisLabelHeight)}
        r={2}
        fill="rgba(0,0,0,0.6)"
      />
    ))}
  </g>
);

type BarGroupProps<T extends {}> = {
  group: Group<T>;
  xCoord: number;
  scalingFactor: (x: number) => number;
};

const BarGroup = <T extends {}>({
  group, scalingFactor, xCoord
}: BarGroupProps<T>) => (
  <g>
    {Object.entries(group.data).map(([key, items], index) => (
      <Bar
        key={key}
        items={items}
        yAxisPoint={group.yAxisPoint}
        xCoord={xCoord + (barSpacingInGroup * index)}
        scalingFactor={scalingFactor}
      />
    ))}
  </g>
);

type ScatterLineGraphProps<T> = { graphData: Group<T>[]; height: number };

const ScatterLineGraph = <T extends {}>({ graphData, height }: ScatterLineGraphProps<T>): React.ReactElement => {
  const maxOfSpread = useMemo(() => Math.max(...valuesUsing(graphData)), [graphData]);
  const scalingFactor = useCallback((value: number) => value / maxOfSpread, [maxOfSpread]);
  const computedWidth = useMemo(() => graphWidth(graphData), [graphData]);

  return (
    <svg viewBox={`0 0 ${computedWidth} ${graphHeight}`} height={height}>
      <line
        // x axis
        x1={yAxisLabelWidth - labelOverhang}
        y1={graphHeight - xAxisLabelHeight}
        x2={computedWidth}
        y2={graphHeight - xAxisLabelHeight}
        stroke="#ddd"
        strokeWidth={1}
      />
      <line
        // y axis
        x1={yAxisLabelWidth}
        y1={0}
        x2={yAxisLabelWidth}
        y2={graphHeight - xAxisLabelHeight + labelOverhang}
        stroke="#ddd"
        strokeWidth={1}
      />
      {graphData.map((group, index) => (
        <BarGroup
          key={group.label}
          scalingFactor={scalingFactor}
          group={group}
          xCoord={((index * groupSpacing) + (groupSpacing / 2)) + yAxisLabelWidth}
        />
      ))}
    </svg>
  );
};

export default ScatterLineGraph;
