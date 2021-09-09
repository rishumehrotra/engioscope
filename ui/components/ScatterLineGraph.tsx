/* eslint-disable @typescript-eslint/ban-types */
import { map } from 'rambda';
import React from 'react';

type GraphData<T> = Record<string, T[]>;
type Group<T> = { label: string; data: GraphData<T>; yAxisPoint: (value: T) => number };

// const valuesUsing = <T extends {}>(graphData: Group<T>[]) => (
//   Object.values(graphData.map(prop('data')))
//     .flatMap(x => Object.values(x))
//     .flat()
//     .map(yAxisPoint)
// );

const valuesUsing = <T extends {}>(graphData: Group<T>[]) => (
  graphData.flatMap(({ data, yAxisPoint }) => Object.values(data).flatMap(map(yAxisPoint)))
);

type BarProps<T extends {}> = {
  items: T[];
  yAxisPoint: (x: T) => number;
  height: number;
  xCoord: number;
  scalingFactor: (x: number) => number;
};

const Bar = <T extends {}>({
  items, yAxisPoint, height, scalingFactor, xCoord
}: BarProps<T>) => (
  <g>
    {items.map((item, index) => (
      <circle
        key={index}
        cx={(Math.random() * 10) + xCoord}
        cy={height - (scalingFactor(yAxisPoint(item)) * height)}
        r={1}
        fill="rgba(0,0,0,0.6)"
      />
    ))}
  </g>
);

type BarGroupProps<T extends {}> = {
  group: Group<T>;
  height: number;
  xCoord: number;
  scalingFactor: (x: number) => number;
};

const BarGroup = <T extends {}>({
  group, height, scalingFactor, xCoord
}: BarGroupProps<T>) => (
  <g>
    {Object.entries(group.data).map(([key, items], index) => (
      <Bar
        key={key}
        items={items}
        yAxisPoint={group.yAxisPoint}
        height={height}
        xCoord={xCoord + (20 * index)}
        scalingFactor={scalingFactor}
      />
    ))}
  </g>
);

type ScatterLineGraphProps<T> = {
  graphData: Group<T>[];
  width: number;
  height: number;
};

const ScatterLineGraph = <T extends {}>({
  graphData, width, height
}: ScatterLineGraphProps<T>): React.ReactElement => {
  const maxOfSpread = Math.max(...valuesUsing(graphData));
  const scalingFactor = (value: number) => value / maxOfSpread;

  return (
    <svg viewBox={`0 0 ${width} ${height}`}>
      {graphData.map((group, index) => (
        <BarGroup
          key={group.label}
          height={height}
          scalingFactor={scalingFactor}
          group={group}
          xCoord={index * 30}
        />
      ))}
    </svg>
  );
};

export default ScatterLineGraph;
