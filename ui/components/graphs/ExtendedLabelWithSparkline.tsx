import React, { useMemo } from 'react';
import { divide, toPercentage } from '../../../shared/utils';
import { Sparkline } from './Sparkline';
import type { Renderer } from './sparkline-renderers';

const trendDirection = (currentValue: number, previousValue: number) => {
  if (currentValue > previousValue) return 'up';
  if (currentValue < previousValue) return 'down';
  return 'same';
};

export type ExtendedLabelWithSparklineProps<T> = {
  data: T[];
  toValue: (item: T) => number | undefined;
  combineValues: (item: T[]) => number;
  colorBy?: (values: (number | undefined)[]) => string;
  valueToLabel: (value: number) => string;
  renderer?: Renderer;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const LabelWithSparkline2 = <T extends {}>({
  data, toValue, colorBy, valueToLabel, renderer, combineValues
}: ExtendedLabelWithSparklineProps<T>) => {
  const thisMonthValue = useMemo(() => combineValues(data.slice(-4)), [combineValues, data]);

  const dataForSparkline = useMemo(() => data.map(toValue), [data, toValue]);

  const previousMonthStats = useMemo(() => {
    if (data.length < 5) return null;
    const previousMonthData = data.slice(-5).slice(0, 4);
    const previousMonthValue = combineValues(previousMonthData);

    return {
      value: previousMonthValue,
      color: colorBy?.([previousMonthValue, thisMonthValue]),
      trendDirection: trendDirection(thisMonthValue, previousMonthValue),
      changePercentage: divide(thisMonthValue - previousMonthValue, previousMonthValue)
        .map(toPercentage)
        .getOr('0%')
    };
  }, [colorBy, combineValues, data, thisMonthValue]);

  return (
    <span className="grid">
      <span className="inline-flex items-end gap-x-0.5">
        {valueToLabel(thisMonthValue)}
        <Sparkline
          data={dataForSparkline}
          lineColor={colorBy?.(dataForSparkline)}
          yAxisLabel={valueToLabel}
          renderer={renderer}
        />
      </span>
      {previousMonthStats ? (
        <span className="text-sm text-gray-600" style={{ color: previousMonthStats.color }}>
          {/* eslint-disable-next-line no-nested-ternary */}
          {previousMonthStats.trendDirection === 'up'
            ? '▲'
            : previousMonthStats.trendDirection === 'same'
              ? ' '
              : '▼'}
          {' '}
          {valueToLabel(Math.abs(thisMonthValue - previousMonthStats.value))}
          {' '}
          {parseInt(previousMonthStats.changePercentage, 10) === 0
            ? null
            : (
              <span className="text-xs">
                (
                {parseInt(previousMonthStats.changePercentage, 10) > 0 ? '+' : null}
                {previousMonthStats.changePercentage}
                )
              </span>
            )}
        </span>
      ) : null}
    </span>
  );
};

export default LabelWithSparkline2;
