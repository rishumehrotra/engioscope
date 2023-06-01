import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { last } from 'rambda';
import { exists } from '../../helpers/utils.js';

const graphConfig = {
  width: 300,
  height: 60,
  yAxisLabelHeight: 0,
  yAxisLabelWidth: 0,
  xAxisLabelHeight: 0,
  xAxisOverhang: 0,
  yAxisOverhang: 0,
  topPadding: 2,
};

export type Renderer = {
  (x: {
    color: { line: string; area: string };
    lineStrokeWidth: number;
    strokeDasharray?: string;
  }): ({
    data,
    yCoord,
    xCoord,
  }: {
    data: (number | undefined)[];
    yCoord: (value: number) => number;
    xCoord: (index: number) => number;
  }) => ReactNode | ReactNode[];
};

export const pathRenderer: Renderer =
  ({ color, lineStrokeWidth }) =>
  ({ data, yCoord, xCoord }) => {
    // eslint-disable-next-line unicorn/prefer-includes
    if (data.some(i => i === undefined)) {
      throw new Error("pathRenderer can't handle undefined values");
    }

    return (
      <>
        <path
          d={data
            .map(
              (item, itemIndex) =>
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                `${itemIndex === 0 ? 'M' : 'L'} ${xCoord(itemIndex)} ${yCoord(item!)}`
            )
            .join(' ')}
          fill="none"
          stroke={color.line}
          strokeWidth={lineStrokeWidth}
        />
        <polygon
          points={data
            .map(
              (item, itemIndex) =>
                `${itemIndex === 0 ? `${xCoord(itemIndex)},${yCoord(0)} ` : ''}${xCoord(
                  itemIndex
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                )},${yCoord(item!)} ${
                  itemIndex === data.length - 1
                    ? ` ${xCoord(itemIndex)},${yCoord(0)}`
                    : ''
                }`
            )
            .join(' ')}
          fill={color.area}
        />
      </>
    );
  };

const mustSkip = (item: number | undefined | null): item is undefined | null =>
  item === undefined || item === null;

export const pathRendererSkippingUndefineds: Renderer =
  ({ color, lineStrokeWidth, strokeDasharray }) =>
  ({ data, yCoord, xCoord }) => {
    type Point = [xCoord: number, yCoord: number];

    const drawLine = (continuous: boolean) => (p1: Point, p2: Point, index: number) =>
      (
        <line
          key={index}
          x1={p1[0]}
          y1={p1[1]}
          x2={p2[0]}
          y2={p2[1]}
          stroke={color.line}
          strokeWidth={lineStrokeWidth}
          strokeDasharray={continuous ? '' : strokeDasharray || '7,5'}
        />
      );

    const brokenLine = drawLine(false);
    const continuousLine = drawLine(true);

    const nodes = data
      .map<Point | undefined>((item, itemIndex) =>
        mustSkip(item) ? undefined : [xCoord(itemIndex), yCoord(item)]
      )
      .reduce<(Point | undefined)[]>((acc, item) => {
        if (acc.length === 0 && item === undefined) return [];

        if (item === undefined) {
          if (last(acc) === undefined) return acc;
          return [...acc, undefined];
        }

        return [...acc, item];
      }, []);

    return nodes.reduce<ReactNode[]>(
      (acc, item, itemIndex) => {
        if (itemIndex === 0) return acc;
        if (item === undefined) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const prevItem = nodes[itemIndex - 1]!; // Prev item definitely exists
          const nextItem = nodes[itemIndex + 1];

          if (!nextItem) {
            // trailing broken line
            return [
              ...acc,
              brokenLine(prevItem, [xCoord(data.length - 1), prevItem[1]], itemIndex),
            ];
          }

          return [...acc, brokenLine(prevItem, nextItem, itemIndex)];
        }

        const prevItem = nodes[itemIndex - 1];
        if (prevItem === undefined) return acc;
        return [...acc, continuousLine(prevItem, item, itemIndex)];
      },
      [
        // start with an skip segment. Might be zero length.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        brokenLine([xCoord(0), nodes[0]![1]], nodes[0]!, -1),
      ]
    );
  };

const computeLineGraphData = (
  config: typeof graphConfig,
  data: (number | undefined)[],
  renderer: ReturnType<Renderer>
) => {
  const dataWithoutUndefineds = data.filter(exists);
  const maxValue = Math.max(...dataWithoutUndefineds);
  const popoverSpacing = config.width / (data.length - 1);
  const xAxisYLocation = config.height + config.yAxisOverhang + config.topPadding;
  const yAxisXLocation = config.yAxisLabelWidth;
  const popoverXCoord = (index: number) =>
    index * popoverSpacing + config.yAxisLabelWidth;
  const popoverYCoord = (value: number) =>
    config.height -
    (value / maxValue) * config.height +
    config.yAxisOverhang +
    config.topPadding;

  return {
    svgHeight:
      config.height + config.yAxisOverhang + config.xAxisLabelHeight + config.topPadding,
    svgWidth: config.width + config.yAxisLabelWidth + config.xAxisOverhang,
    xAxisCoords: {
      x1: config.yAxisLabelWidth - config.xAxisOverhang,
      y1: xAxisYLocation,
      x2: config.yAxisLabelWidth + config.width + config.xAxisOverhang,
      y2: xAxisYLocation,
    },
    yAxisCoords: {
      x1: yAxisXLocation,
      y1: config.topPadding,
      x2: yAxisXLocation,
      y2: config.height + config.yAxisOverhang * 2 + config.topPadding,
    },
    paths: renderer({ data, yCoord: popoverYCoord, xCoord: popoverXCoord }),
  };
};

type TinyAreaGraphProps = {
  color: { line: string; area: string };
  data: (number | undefined)[];
  renderer: Renderer;
  className?: string;
};

const TinyAreaGraph: React.FC<TinyAreaGraphProps> = ({
  renderer,
  data,
  color,
  className,
}) => {
  const lineGraph = useMemo(
    () =>
      computeLineGraphData(
        graphConfig,
        data,
        renderer({ color, lineStrokeWidth: 2, strokeDasharray: '7,5' })
      ),
    [color, data, renderer]
  );

  return (
    <svg
      height={lineGraph.svgHeight}
      width={lineGraph.svgWidth}
      viewBox={`0 0 ${lineGraph.svgWidth} ${lineGraph.svgHeight}`}
      className={className}
    >
      {lineGraph.paths}
    </svg>
  );
};

export default TinyAreaGraph;