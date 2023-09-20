/* eslint-disable @typescript-eslint/ban-types */
import { add, identity, map, range } from 'rambda';
import React, { Fragment, useCallback, useMemo } from 'react';
import { asc, byNum } from 'sort-lib';
import { Tooltip } from 'react-tooltip';
import hexToHsl from '../../helpers/hex-to-hsl.js';
import { prettyMS } from '../../helpers/utils.js';

const xAxisLabelAreaHeight = 80;
const xAxisLabelHeight = 80;
const xAxisLabelWidth = 100;
const yAxisLabelWidth = 80;
const graphHeight = 400;
const scatterWidth = 30;
const groupSpacing = 70;
const graphBarXPadding = 30;
const barSpacingInGroup = 115;
const labelOverhang = 10;
const bubbleSize = 7;
const gridLinesCount = 5;
const yAxisLabelHeight = 20;
const graphTopPadding = bubbleSize;

type GraphData<T> = Record<string, T[]>;
type Group<T> = {
  label: string;
  data: GraphData<T> | undefined;
  yAxisPoint: (value: T) => number;
  tooltip: (x: T, label: string, yAxisPoint: number) => string;
  pointColor?: (value: T) => string | null | undefined;
};

const valuesUsing = <T extends {}>(graphData: Group<T>[]) =>
  graphData.flatMap(({ data, yAxisPoint }) =>
    Object.values(data || {}).flatMap(map(yAxisPoint))
  );

const median = (values: number[]) => {
  const sortedValues = [...values].sort(asc(byNum(identity)));
  const middleIndex = Math.floor(sortedValues.length / 2);
  return sortedValues[middleIndex];
};

const groupWidth = <T extends {}>(x: Group<T>) =>
  Object.values(x.data || {}).length * barSpacingInGroup;

const graphWidth = <T extends {}>(groups: Group<T>[]) =>
  Object.values(groups)
    .map(groupWidth)
    .filter(width => width > 0)
    .reduce((acc, curr) => acc + curr + groupSpacing, 0) +
  yAxisLabelWidth -
  groupSpacing +
  graphBarXPadding;

const xCoordForBarGroup = <T extends {}>(
  graphData: Group<T>[],
  group: Group<T>
): number =>
  graphData
    .slice(0, graphData.indexOf(group))
    .map(groupWidth)
    .filter(width => width > 0)
    .reduce((acc, curr) => acc + curr + groupSpacing, 0) +
  groupSpacing / 2 +
  yAxisLabelWidth +
  graphBarXPadding;

// Prevents shifting of data on re-render
const getRandom = (<T extends {}>() => {
  const randomMap = new WeakMap<T, number>();
  return (x: T) => {
    if (!randomMap.has(x)) randomMap.set(x, Math.random());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return randomMap.get(x)!;
  };
})();

type BarProps<T extends {}> = {
  items: T[];
  yAxisPoint: (x: T) => number;
  xCoord: number;
  yCoord: (x: number) => number;
  pointColor?: (x: T) => string | null | undefined;
  tooltip: (x: T, label: string, yAxisPoint: number) => string;
  label: string;
  linkForItem: (x: T) => string;
  onPointHover?: (x: T) => void;
  pointTooltipId?: string;
};

const Bar = <T extends {}>({
  items,
  yAxisPoint,
  xCoord,
  tooltip,
  yCoord,
  pointColor,
  label,
  linkForItem,
  onPointHover,
  pointTooltipId,
}: BarProps<T>) => {
  const averageValueOfItems = items.length
    ? items.map(yAxisPoint).reduce(add, 0) / items.length
    : 0;
  const medianValue = median(items.map(yAxisPoint));

  return (
    <g>
      <foreignObject
        x={xCoord - xAxisLabelWidth / 2}
        y={yCoord(0) + graphTopPadding}
        width={xAxisLabelWidth}
        height={xAxisLabelHeight}
      >
        <div className="text-sm text-theme-helptext text-center">{label}</div>
        <div className="text-sm text-theme-icon text-center">
          Average: {prettyMS(averageValueOfItems)}
        </div>
      </foreignObject>
      {items.map((item, index) => {
        const fillColorHSL = hexToHsl(pointColor?.(item) || '#197fe6');
        const fillColorWithJitter = `hsla(${
          Math.round(getRandom(item) * 30) + (fillColorHSL[0] - 15)
        }, 80%, 50%, 0.7)`;
        const yPoint = yAxisPoint(item);

        return (
          // eslint-disable-next-line react/no-array-index-key
          <a key={index} href={linkForItem(item)} target="_blank" rel="noreferrer">
            <circle
              cx={getRandom(item) * scatterWidth + xCoord - scatterWidth / 2}
              cy={yCoord(yPoint)}
              r={bubbleSize}
              fill={fillColorWithJitter}
              stroke="0"
              {...(onPointHover
                ? {
                    'onMouseOver': () => onPointHover(item),
                    'data-tooltip-id': pointTooltipId || 'scatter-tooltip',
                  }
                : {
                    'data-tooltip-id': pointTooltipId || 'scatter-tooltip',
                    'data-tooltip-html': tooltip(item, label, yPoint),
                  })}
            />
          </a>
        );
      })}
      {items.length ? (
        <line
          x1={xCoord - scatterWidth}
          y1={yCoord(averageValueOfItems)}
          x2={xCoord + scatterWidth}
          y2={yCoord(averageValueOfItems)}
          stroke="rgba(255,0,0,0.6)"
          strokeWidth={5}
          data-tooltip-id="scatter-tooltip"
          data-tooltip-content={`Average ${label} time: ${prettyMS(
            averageValueOfItems
          )} of ${items.length} items`}
        />
      ) : null}
      {items.length ? (
        <line
          x1={xCoord - scatterWidth}
          y1={yCoord(medianValue)}
          x2={xCoord + scatterWidth}
          y2={yCoord(medianValue)}
          stroke="rgba(0,0,255,0.6)"
          strokeWidth={5}
          data-tooltip-id="scatter-tooltip"
          data-tooltip-content={`Median ${label} time: ${prettyMS(medianValue)} of ${
            items.length
          } items`}
        />
      ) : null}
    </g>
  );
};

type BarGroupProps<T extends {}> = {
  group: Group<T>;
  xCoord: number;
  yCoord: (x: number) => number;
  pointToColor?: (x: T) => string | null | undefined;
  linkForItem: (x: T) => string;
  onPointHover?: (x: T) => void;
  pointTooltipId?: string;
};

const BarGroup = <T extends {}>({
  group,
  xCoord,
  yCoord,
  linkForItem,
  pointToColor,
  onPointHover,
  pointTooltipId,
}: BarGroupProps<T>) => (
  <g>
    {Object.entries(group.data || {}).length > 1 ? (
      <foreignObject
        x={xCoord - scatterWidth / 2}
        y={yCoord(0) + xAxisLabelHeight}
        width={
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (Object.entries(group.data!).length - 1) * (barSpacingInGroup + scatterWidth) -
          barSpacingInGroup / 2
        }
        height={xAxisLabelAreaHeight}
      >
        <div className="text-sm text-gray-700 text-center">{group.label}</div>
      </foreignObject>
    ) : null}
    {Object.entries(group.data || {}).map(([key, items], index) => (
      <Bar
        key={key}
        items={items}
        label={Object.entries(group.data || {}).length === 1 ? group.label : key}
        yAxisPoint={group.yAxisPoint}
        xCoord={xCoord + barSpacingInGroup * index}
        yCoord={yCoord}
        pointColor={pointToColor}
        tooltip={group.tooltip}
        linkForItem={linkForItem}
        onPointHover={onPointHover}
        pointTooltipId={pointTooltipId}
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
    {range(0, gridLinesCount).map(gridLineIndex => {
      const gridLineValue =
        (maxValue * (gridLinesCount - gridLineIndex)) / gridLinesCount;

      return (
        <Fragment key={gridLineIndex}>
          <line
            x1={yAxisLabelWidth - labelOverhang}
            y1={yCoord(gridLineValue)}
            x2={width}
            y2={yCoord(gridLineValue)}
            stroke="#ddd"
            strokeWidth={1}
          />
          <foreignObject
            x={0}
            y={yCoord(gridLineValue) - yAxisLabelHeight / 2}
            width={yAxisLabelWidth}
            height={yAxisLabelHeight}
          >
            <div className="text-right text-sm text-gray-700 pr-3">
              {gridLineValue > 0 ? prettyMS(gridLineValue) : '-'}
            </div>
          </foreignObject>
        </Fragment>
      );
    })}
  </>
);

export type ScatterLineGraphProps<T> = {
  graphData: Group<T>[];
  height: number;
  linkForItem: (x: T) => string;
  pointColor?: (x: T) => string | null | undefined;
  className?: string;
  onPointHover?: (x: T) => void;
  pointTooltipId?: string;
};

const ScatterLineGraph = <T extends {}>({
  graphData,
  height,
  linkForItem,
  className,
  pointColor,
  onPointHover,
  pointTooltipId,
}: ScatterLineGraphProps<T>): React.ReactElement => {
  const maxOfSpread = useMemo(() => Math.max(...valuesUsing(graphData)), [graphData]);
  const computedWidth = useMemo(() => graphWidth(graphData), [graphData]);
  const yCoord = useCallback(
    (value: number) => {
      const availableHeight = graphHeight - xAxisLabelAreaHeight - graphTopPadding;
      return availableHeight - (value / maxOfSpread) * availableHeight + graphTopPadding;
    },
    [maxOfSpread]
  );

  return (
    <>
      <svg
        viewBox={`0 0 ${computedWidth} ${graphHeight}`}
        height={height}
        className={className}
      >
        <Axes width={computedWidth} maxValue={maxOfSpread} yCoord={yCoord} />
        {graphData.map(group => (
          <BarGroup
            key={group.label}
            group={group}
            xCoord={xCoordForBarGroup(graphData, group)}
            yCoord={yCoord}
            pointToColor={pointColor}
            linkForItem={linkForItem}
            onPointHover={onPointHover}
            pointTooltipId={pointTooltipId}
          />
        ))}
      </svg>
      <Tooltip
        id="scatter-tooltip"
        className="z-50 text-base"
        style={{ borderRadius: '0.375rem', fontSize: '0.875rem', lineHeight: '1.25rem' }}
      />
    </>
  );
};

export default ScatterLineGraph;
