/* eslint-disable @typescript-eslint/ban-types */
import React from 'react';

type GraphData<T> = Record<string, T[]>;

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

type ScatterLineGraphProps<T> = {
  graphData: GraphData<T>;
  yAxisPoint: (value: T) => number;
  width: number;
  height: number;
};

const ScatterLineGraph = <T extends {}>({
  graphData, width, height, yAxisPoint
}: ScatterLineGraphProps<T>): React.ReactElement => {
  const spreadOfValues = Object.values(graphData).flatMap(x => x.flatMap(yAxisPoint));
  const maxOfSpread = Math.max(...spreadOfValues);
  const scalingFactor = (value: number) => value / maxOfSpread;

  return (
    <svg viewBox={`0 0 ${width} ${height}`}>
      {Object.entries(graphData).map(([key, data], index) => (
        <Bar
          key={key}
          height={height}
          scalingFactor={scalingFactor}
          items={data}
          yAxisPoint={yAxisPoint}
          xCoord={index * 30}
        />
      ))}
    </svg>
  );
};

export default ScatterLineGraph;
