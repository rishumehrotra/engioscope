/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import type { ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { head, last } from 'rambda';
import { exists, shortDate } from '../../helpers/utils.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { oneWeekInMs } from '../../../shared/utils.js';

type GraphConfig = {
  width: number;
  height: number;
  strokeDasharray: [visibleLength: number, gapLength: number];
  lineWidth: number;
  hoverPointRadius: number;
  hoverPointStroke: number;
};

type GraphOptions<T extends unknown> = {
  data: T[] | undefined;
  itemToValue: (x: T) => number | undefined;
  itemTooltipLabel?: (item: T) => string;
  dateForIndex: (x: number) => Date | undefined;
  color: { line: string; area: string } | null;
  graphConfig: GraphConfig;
};

export const graphConfig = {
  large: {
    width: 300,
    height: 60,
    strokeDasharray: [7, 5],
    lineWidth: 1,
    hoverPointRadius: 8,
    hoverPointStroke: 4,
  },
  medium: {
    width: 161,
    height: 33,
    strokeDasharray: [7, 5],
    lineWidth: 1,
    hoverPointRadius: 6,
    hoverPointStroke: 2,
  },
  small: {
    width: 50,
    height: 32,
    strokeDasharray: [7, 5],
    lineWidth: 1,
    hoverPointRadius: 8,
    hoverPointStroke: 3,
  },
} satisfies Record<string, GraphConfig>;

export const areaGraphColors = {
  good: {
    line: 'rgba(var(--color-text-success), 1)',
    area: 'rgba(var(--color-bg-success), 0.2)',
  },
  bad: {
    line: 'rgba(var(--color-text-danger), 1)',
    area: 'rgba(var(--color-bg-danger), 0.2)',
  },
  neutral: {
    line: 'rgba(var(--color-text-icon), 1)',
    area: 'rgba(var(--color-text-icon), 0.2)',
  },
};

type RendererProps<T extends unknown> = {
  data: T[];
  color: GraphOptions<number>['color'];
  itemToValue: (x: T) => number | undefined;
  // eslint-disable-next-line react/no-unused-prop-types
  itemTooltipLabel?: (x: T) => string;
  yCoord: (value: number) => number;
  xCoord: (index: number) => number;
  // eslint-disable-next-line react/no-unused-prop-types
  options: Omit<GraphConfig, 'width' | 'height'>;
  // eslint-disable-next-line react/no-unused-prop-types
  dateForIndex: (index: number) => Date | undefined;
};

const HoverPoints = <T extends unknown>({
  color,
  itemTooltipLabel,
  itemToValue,
  data,
  yCoord,
  xCoord,
  options,
  dateForIndex,
}: RendererProps<T>) => {
  if (!itemTooltipLabel) return null;

  return data.map((item, itemIndex) => {
    const value = itemToValue(item);
    if (!value) return null;

    return (
      <circle
        // eslint-disable-next-line react/no-array-index-key
        key={itemIndex}
        cx={xCoord(itemIndex)}
        cy={yCoord(value)}
        r={options.hoverPointRadius}
        fill={(color || areaGraphColors.neutral).line}
        strokeWidth={options.hoverPointStroke}
        stroke="#fff"
        className="opacity-0 hover:opacity-100 drop-shadow"
        data-tooltip-id="react-tooltip"
        data-tooltip-html={[
          itemTooltipLabel(item),
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          `<div className="mt-2">${shortDate(dateForIndex(itemIndex)!)}</div>`,
        ].join(' ')}
      />
    );
  });
};

const AreaUnder = <T extends unknown>({
  color,
  data,
  itemToValue,
  yCoord,
  xCoord,
}: RendererProps<T>) => {
  const points = useMemo(() => {
    const firstValidItem = data.map(itemToValue).find(x => x !== undefined) || 0;

    return data
      .reduce<[number, number][]>((acc, item, itemIndex) => {
        if (itemIndex === 0) {
          acc.push([itemIndex, 0]);
        }

        acc.push([
          itemIndex,
          itemToValue(item) ?? (itemIndex === 0 ? firstValidItem : acc[itemIndex][1]),
        ]);

        if (itemIndex === data.length - 1) {
          acc.push([itemIndex, 0]);
        }
        return acc;
      }, [])
      .map(item => `${xCoord(item[0])},${yCoord(item[1])}`)
      .join(' ');
  }, [data, itemToValue, xCoord, yCoord]);

  return (
    <polygon key="poly" points={points} fill={(color || areaGraphColors.neutral).area} />
  );
};

const GraphPath = <T extends unknown>({
  color,
  itemToValue,
  data: inputData,
  yCoord,
  xCoord,
  options,
}: RendererProps<T>) => {
  const pathPoints = useMemo(() => {
    // Casting to number[] is ok here, since this renderer is only chosen if there are no undefineds
    const data = inputData.map(itemToValue) as number[];
    return data
      .map(
        (item, itemIndex) =>
          `${itemIndex === 0 ? 'M' : 'L'} ${xCoord(itemIndex)} ${yCoord(item)}`
      )
      .join(' ');
  }, [inputData, itemToValue, xCoord, yCoord]);

  return (
    <path
      className="transition-all duration-200"
      d={pathPoints}
      fill="none"
      stroke={(color || areaGraphColors.neutral).line}
      strokeWidth={options.lineWidth}
    />
  );
};

const mustSkip = (item: number | undefined | null): item is undefined | null =>
  item === undefined || item === null;

const GroupPathSkippingUndefineds = <T extends unknown>({
  color,
  data,
  itemToValue,
  yCoord,
  xCoord,
  options,
}: RendererProps<T>) => {
  type Point = [xCoord: number, yCoord: number];
  type LineProps = {
    p1: Point;
    p2: Point;
    index: number;
  };

  const [BrokenLine, ContinuousLine] = useMemo(() => {
    const createLineComponent = (continuous: boolean) => {
      return ({ p1, p2, index }: LineProps) => (
        <line
          key={index}
          x1={p1[0]}
          y1={p1[1]}
          x2={p2[0]}
          y2={p2[1]}
          stroke={(color || areaGraphColors.neutral).line}
          strokeWidth={options.lineWidth}
          strokeDasharray={continuous ? '' : options.strokeDasharray.join(',')}
        />
      );
    };

    const BrokenLine = createLineComponent(false);
    const ContinuousLine = createLineComponent(true);

    return [BrokenLine, ContinuousLine] as const;
  }, [color, options.lineWidth, options.strokeDasharray]);

  const nodes = useMemo(() => {
    return data
      .map<Point | undefined>((item, itemIndex) =>
        mustSkip(itemToValue(item))
          ? undefined
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            [xCoord(itemIndex), yCoord(itemToValue(item)!)]
      )
      .reduce<(Point | undefined)[]>((acc, item) => {
        if (acc.length === 0 && item === undefined) return [];

        if (item === undefined) {
          if (last(acc) === undefined) return acc;
          return [...acc, undefined];
        }

        return [...acc, item];
      }, []);
  }, [data, itemToValue, xCoord, yCoord]);

  if (!nodes.length) return;

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
            acc.push(
              <BrokenLine
                key={acc.length}
                p1={prevItem}
                p2={[xCoord(data.length - 1), prevItem[1]]}
                index={itemIndex}
              />
            );
            return acc;
          }

          acc.push(
            <BrokenLine key={acc.length} p1={prevItem} p2={nextItem} index={itemIndex} />
          );
          return acc;
        }

        const prevItem = nodes[itemIndex - 1];
        if (prevItem === undefined) return acc;

        acc.push(
          <ContinuousLine key={acc.length} p1={prevItem} p2={item} index={itemIndex} />
        );
        return acc;
      },
      [
        // start with an skip segment. Might be zero length.
        <BrokenLine
          key="first"
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          p1={[xCoord(0), nodes[0]![1]]}
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          p2={nodes[0]!}
          index={-1}
        />,
      ]
    ),
  ];
};

const LineGraph = <T extends unknown>({
  data,
  itemToValue,
  graphConfig,
  itemTooltipLabel,
  ...rest
}: GraphOptions<T>) => {
  const { Renderer, rendererProps } = useMemo(() => {
    const values = data?.map(itemToValue);
    const maxValue = Math.max(...(values || []).filter(exists));

    const Renderer = values?.includes(undefined)
      ? GroupPathSkippingUndefineds
      : GraphPath;

    const paddingForLineWidth = Math.ceil(graphConfig.lineWidth / 2);
    const paddingForHoverPoint = Math.ceil(
      (graphConfig.hoverPointRadius + graphConfig.hoverPointStroke) / 2
    );
    const topPadding = Math.max(paddingForLineWidth, paddingForHoverPoint);

    const leftPadding = Math.ceil(
      (graphConfig.hoverPointRadius + graphConfig.hoverPointStroke) / 2
    );
    const rightPadding = Math.ceil(
      (graphConfig.hoverPointRadius + graphConfig.hoverPointStroke) / 2
    );
    const itemYSpacing =
      (graphConfig.width - leftPadding - rightPadding) / ((data || []).length - 1);

    const xCoord = (index: number) => index * itemYSpacing + leftPadding;
    const yCoord = (value: number) =>
      graphConfig.height - (value / maxValue) * (graphConfig.height - topPadding);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { width, height, ...options } = graphConfig;

    return {
      rendererProps: {
        data: data || [],
        itemToValue,
        itemTooltipLabel,
        yCoord,
        xCoord,
        options,
        ...rest,
      },
      Renderer,
    };
  }, [data, graphConfig, itemToValue, itemTooltipLabel, rest]);

  if (!data) return null;

  return (
    <>
      <AreaUnder {...rendererProps} />
      <Renderer {...rendererProps} />
      <HoverPoints {...rendererProps} />,
    </>
  );
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

type TinyAreaGraphProps<T extends unknown> = Omit<GraphOptions<T>, 'dateForIndex'> & {
  className?: string;
};

const TinyAreaGraph = <T extends unknown>({
  className,
  ...props
}: TinyAreaGraphProps<T>) => {
  const endDate = useQueryContext()[3];

  const dateForIndex = useCallback(
    (itemIndex: number) => {
      if (!props.data) return;

      const numberOfItems = props.data.length;
      const weeksToDeduct = numberOfItems - itemIndex - 1;
      return new Date(endDate.getTime() - weeksToDeduct * oneWeekInMs);
    },
    [endDate, props.data]
  );

  const [svgHeight, svgWidth] = useMemo(() => {
    return [props.graphConfig.height, props.graphConfig.width] as const;
  }, [props.graphConfig.height, props.graphConfig.width]);

  return (
    <svg
      height={svgHeight}
      width={svgWidth}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={className}
    >
      <LineGraph dateForIndex={dateForIndex} {...props} />
    </svg>
  );
};

export default TinyAreaGraph;
