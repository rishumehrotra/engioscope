import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { head, last } from 'rambda';
import { exists } from '../../helpers/utils.js';

type GraphConfig = {
  width: number;
  height: number;
  topPadding: number;
  strokeDasharray: [visibleLength: number, gapLength: number];
};

export const graphConfig = {
  large: {
    width: 300,
    height: 60,
    topPadding: 2,
    strokeDasharray: [7, 5],
  },
  medium: {
    width: 161,
    height: 33,
    topPadding: 2,
    strokeDasharray: [7, 5],
  },
  small: {
    width: 50,
    height: 32,
    topPadding: 2,
    strokeDasharray: [7, 5],
  },
} satisfies Record<string, GraphConfig>;

export const areaGraphColors = {
  good: {
    line: 'rgba(var(--color-text-success), 1)',
    area: 'rgba(var(--color-bg-success), 0.1)',
  },
  bad: {
    line: 'rgba(var(--color-text-danger), 1)',
    area: 'rgba(var(--color-bg-danger), 0.1)',
  },
  neutral: {
    line: 'rgba(var(--color-text-helptext), 1)',
    area: 'rgba(var(--color-text-helptext), 0.1)',
  },
};

export type Renderer = {
  (x: {
    color: { line: string; area: string };
    lineStrokeWidth: number;
    strokeDasharray?: string;
    dataPointTooltipLabel?: (x: number) => string;
  }): (x: {
    data: (number | undefined)[];
    yCoord: (value: number) => number;
    xCoord: (index: number) => number;
  }) => ReactNode | ReactNode[];
};

export const pathRenderer: Renderer =
  ({ color, lineStrokeWidth, dataPointTooltipLabel }) =>
  ({ data: inputData, yCoord, xCoord }) => {
    if (inputData.includes(undefined)) {
      throw new Error("pathRenderer can't handle undefined values");
    }

    const data = inputData.filter(exists);

    const enableTooltip = false;

    return (
      <>
        <path
          className="transition-all duration-200"
          d={data
            .map(
              (item, itemIndex) =>
                `${itemIndex === 0 ? 'M' : 'L'} ${xCoord(itemIndex)} ${yCoord(item)}`
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
        {dataPointTooltipLabel && enableTooltip
          ? data.map((item, itemIndex) => (
              <circle
                cx={xCoord(itemIndex)}
                cy={yCoord(item)}
                r="8"
                fill={color.line}
                strokeWidth={3}
                stroke="#fff"
                className="shadow opacity-0 hover:opacity-100"
                data-tooltip-id="react-tooltip"
                data-tooltip-content={dataPointTooltipLabel(yCoord(item))}
              />
            ))
          : null}
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

    return [
      ...nodes.reduce<ReactNode[]>(
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
      ),
      <polygon
        key="poly"
        points={data
          .reduce<[number, number][]>(
            (acc, item, itemIndex) => {
              acc.push([itemIndex, item ?? (itemIndex === 0 ? 0 : acc[itemIndex][1])]);

              if (itemIndex === data.length - 1) {
                acc.push([itemIndex, 0]);
              }
              return acc;
            },
            [[0, 0]]
          )
          .map(item => {
            return `${xCoord(item[0])},${yCoord(item[1])}`;
          })
          .join(' ')}
        fill={color.area}
      />,
    ];
  };

const computeLineGraphData = (
  config: GraphConfig,
  data: (number | undefined)[],
  renderer: ReturnType<Renderer>
) => {
  const maxValue = Math.max(...data.filter(exists));
  const itemSpacing = config.width / (data.length - 1);
  const xCoord = (index: number) => index * itemSpacing;
  const yCoord = (value: number) =>
    config.height - (value / maxValue) * config.height + config.topPadding;

  return renderer({ data, yCoord, xCoord });
};

export const increaseIsBetter = (data: number[]) => {
  const end = last(data) || 0;
  const start = head(data) || 0;

  return end - start > 0
    ? areaGraphColors.good
    : end - start === 0
    ? areaGraphColors.neutral
    : areaGraphColors.bad;
};

export const decreaseIsBetter = (data: number[]) => {
  const end = last(data) || 0;
  const start = head(data) || 0;

  return end - start < 0
    ? areaGraphColors.good
    : end - start === 0
    ? areaGraphColors.neutral
    : areaGraphColors.bad;
};

type TinyAreaGraphProps = {
  color: { line: string; area: string } | null;
  data: (number | undefined)[] | null;
  dataPointTooltipLabel?: (item: number) => string;
  renderer: Renderer;
  graphConfig: GraphConfig;
  className?: string;
};

const TinyAreaGraph: React.FC<TinyAreaGraphProps> = ({
  renderer,
  data,
  dataPointTooltipLabel,
  color,
  graphConfig,
  className,
}) => {
  const { svgHeight, svgWidth } = useMemo(() => {
    return {
      svgHeight: graphConfig.height + graphConfig.topPadding,
      svgWidth: graphConfig.width,
    };
  }, [graphConfig.height, graphConfig.topPadding, graphConfig.width]);

  const graphContents = useMemo(
    () =>
      data === null || color === null
        ? null
        : computeLineGraphData(
            graphConfig,
            data,
            renderer({
              color,
              lineStrokeWidth: 1,
              strokeDasharray: graphConfig.strokeDasharray.join(','),
              dataPointTooltipLabel,
            })
          ),
    [color, data, dataPointTooltipLabel, graphConfig, renderer]
  );

  return (
    <svg
      height={svgHeight}
      width={svgWidth}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={className}
    >
      {graphContents}
    </svg>
  );
};

export default TinyAreaGraph;
