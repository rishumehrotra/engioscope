/* eslint-disable @typescript-eslint/ban-types */
import prettyMilliseconds from 'pretty-ms';
import { add, map, range } from 'rambda';
import React, {
  Fragment, useCallback, useEffect, useMemo, useState
} from 'react';
import { oneYear } from '../helpers/utils';

const xAxisLabelAreaHeight = 80;
const xAxisLabelHeight = 50;
const xAxisLabelWidth = 100;
const yAxisLabelWidth = 60;
const graphHeight = 400;
const scatterWidth = 40;
const groupSpacing = 70;
const graphBarXPadding = 30;
const barSpacingInGroup = 100;
const labelOverhang = 10;
const bubbleSize = 5;
const gridLinesCount = 5;
const yAxisLabelHeight = 20;
const graphTopPadding = bubbleSize;

type GraphData<T> = Record<string, T[]>;
type Group<T> = {
  label: string;
  data: GraphData<T> | undefined;
  yAxisPoint: (value: T) => number;
  tooltip: (value: T) => string;
};

const valuesUsing = <T extends {}>(graphData: Group<T>[]) => (
  graphData.flatMap(
    ({ data, yAxisPoint }) => Object.values(data || {})
      .flatMap(map(yAxisPoint))
  )
);

const median = (values: number[]) => {
  const sortedValues = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedValues.length / 2);
  return sortedValues[middleIndex];
};

const groupWidth = <T extends {}>(x: Group<T>) => (
  Object.values(x.data || {}).length * barSpacingInGroup
);

const graphWidth = <T extends {}>(groups: Group<T>[]) => (
  Object.values(groups)
    .map(groupWidth)
    .filter(width => width > 0)
    .reduce((acc, curr) => acc + curr + groupSpacing, 0)
  + yAxisLabelWidth
  - groupSpacing
  + graphBarXPadding
);

const xCoordForBarGroup = <T extends {}>(graphData: Group<T>[], group: Group<T>): number => (
  graphData
    .slice(0, graphData.indexOf(group))
    .map(groupWidth)
    .filter(width => width > 0)
    .reduce((acc, curr) => acc + curr + groupSpacing, 0)
  + (groupSpacing / 2)
  + yAxisLabelWidth
  + graphBarXPadding
);

const randomMap = new WeakMap();
// Prevents shifting of data on re-render
const getRandom = <T extends {}>(x: T) => {
  if (!randomMap.has(x)) randomMap.set(x, Math.random());
  return randomMap.get(x);
};

type BarProps<T extends {}> = {
  items: T[];
  yAxisPoint: (x: T) => number;
  xCoord: number;
  yCoord: (x: number) => number;
  tooltip: (x: T) => string;
  label: string;
  linkForItem: (x: T) => string;
};

const Bar = <T extends {}>({
  items, yAxisPoint, xCoord, tooltip, yCoord, label, linkForItem
}: BarProps<T>) => {
  const averageValueOfItems = items.length
    ? items.map(yAxisPoint).reduce(add, 0) / items.length
    : 0;
  const medianValue = median(items.map(yAxisPoint));

  return (
    <g>
      <foreignObject
        x={xCoord - (xAxisLabelWidth / 2)}
        y={yCoord(0) + graphTopPadding}
        width={xAxisLabelWidth}
        height={xAxisLabelHeight}
      >
        <div className="text-sm text-gray-700 text-center">
          {`${label}`}
        </div>
      </foreignObject>
      {items.map((item, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <a key={index} href={linkForItem(item)} target="_blank" rel="noreferrer">
          <circle
            cx={(getRandom(item) * scatterWidth) + xCoord - (scatterWidth / 2)}
            cy={yCoord(yAxisPoint(item))}
            r={bubbleSize}
            fill="rgba(0,0,0,0.6)"
            data-html
            data-tip={tooltip(item)}
          />
        </a>
      ))}
      {items.length
        ? (
          <line
            x1={xCoord - scatterWidth}
            y1={yCoord(averageValueOfItems)}
            x2={xCoord + scatterWidth}
            y2={yCoord(averageValueOfItems)}
            stroke="rgba(255,0,0,0.6)"
            strokeWidth={5}
            data-tip={`Average ${label}: ${prettyMilliseconds(
              averageValueOfItems,
              averageValueOfItems < oneYear ? { compact: true } : { unitCount: 2 }
            )} of ${items.length} items`}
          />
        )
        : null}
      {items.length
        ? (
          <line
            x1={xCoord - scatterWidth}
            y1={yCoord(medianValue)}
            x2={xCoord + scatterWidth}
            y2={yCoord(medianValue)}
            stroke="rgba(0,0,255,0.6)"
            strokeWidth={5}
            data-tip={`Median ${label}: ${prettyMilliseconds(
              medianValue,
              medianValue < oneYear ? { compact: true } : { unitCount: 2 }
            )} of ${items.length} items`}
          />
        )
        : null}
    </g>
  );
};

type BarGroupProps<T extends {}> = {
  group: Group<T>;
  xCoord: number;
  yCoord: (x: number) => number;
  linkForItem: (x: T) => string;
};

const BarGroup = <T extends {}>({
  group, xCoord, yCoord, linkForItem
}: BarGroupProps<T>) => (
  <g>
    {Object.entries(group.data || {}).length > 1
      ? (
        <foreignObject
          x={xCoord - (scatterWidth / 2)}
          y={yCoord(0) + xAxisLabelHeight}
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          width={((Object.entries(group.data!).length - 1) * (barSpacingInGroup + scatterWidth)) - (barSpacingInGroup / 2)}
          height={xAxisLabelAreaHeight}
        >
          <div className="text-sm text-gray-700 text-center">
            {group.label}
          </div>
        </foreignObject>
      )
      : null}
    {Object.entries(group.data || {}).map(([key, items], index) => (
      <Bar
        key={key}
        items={items}
        label={
          Object.entries(group.data || {}).length === 1
            ? group.label
            : key
        }
        yAxisPoint={group.yAxisPoint}
        xCoord={xCoord + (barSpacingInGroup * index)}
        yCoord={yCoord}
        tooltip={group.tooltip}
        linkForItem={linkForItem}
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
      const gridLineValue = (maxValue * (gridLinesCount - gridLineIndex)) / gridLinesCount;

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
            y={yCoord(gridLineValue) - (yAxisLabelHeight / 2)}
            width={yAxisLabelWidth}
            height={yAxisLabelHeight}
          >
            <div className="text-right text-sm text-gray-700 pr-3">
              {gridLineValue > 0
                ? prettyMilliseconds(gridLineValue, gridLineValue > oneYear
                  ? { unitCount: 2 }
                  : { compact: true })
                : '-'}
            </div>
          </foreignObject>
        </Fragment>
      );
    })}
  </>
);

type ScatterLineGraphProps<T> = {
  graphData: Group<T>[];
  height: number;
  linkForItem: (x: T) => string;
  className?: string;
};

const ScatterLineGraph = <T extends {}>({
  graphData, height, linkForItem, className
}: ScatterLineGraphProps<T>): React.ReactElement => {
  const [showPoints, setShowPoints] = useState(false);
  const maxOfSpread = useMemo(() => Math.max(...valuesUsing(graphData)), [graphData]);
  const computedWidth = useMemo(() => graphWidth(graphData), [graphData]);
  const yCoord = useCallback((value: number) => {
    const availableHeight = graphHeight - xAxisLabelAreaHeight - graphTopPadding;
    return availableHeight - ((value / maxOfSpread) * availableHeight) + graphTopPadding;
  }, [maxOfSpread]);

  useEffect(() => {
    requestAnimationFrame(() => setShowPoints(true));
  }, []);

  return (
    <svg viewBox={`0 0 ${computedWidth} ${graphHeight}`} height={height} className={className}>
      <Axes width={computedWidth} maxValue={maxOfSpread} yCoord={yCoord} />
      {showPoints && (
        graphData.map(group => (
          <BarGroup
            key={group.label}
            group={group}
            xCoord={xCoordForBarGroup(graphData, group)}
            yCoord={yCoord}
            linkForItem={linkForItem}
          />
        ))
      )}
    </svg>
  );
};

export default ScatterLineGraph;
