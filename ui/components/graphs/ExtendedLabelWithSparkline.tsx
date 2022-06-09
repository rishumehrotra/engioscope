import React, { useMemo } from 'react';
import { divide, toPercentage } from '../../../shared/utils';
import { Sparkline } from './Sparkline';
import type { Renderer } from './sparkline-renderers';

type PreviousMonthStats = {
  value: number;
  color: string | undefined;
  trendDirection: 'up' | 'down' | 'same';
  changePercentage: string;
} | null;

const trendDirection = (currentValue: number, previousValue: number) => {
  if (currentValue > previousValue) return 'up';
  if (currentValue < previousValue) return 'down';
  return 'same';
};

const tooltip = (label: string, thisMonthValue: string, previousMonthStats: PreviousMonthStats) => `
  <strong>${thisMonthValue}</strong> ${label} in the last month${
  previousMonthStats && previousMonthStats.trendDirection !== 'same'
    ? `<br />This is a <strong>${
      previousMonthStats?.changePercentage.replace('-', '')
    } ${
      previousMonthStats.trendDirection === 'up' ? 'increase' : 'decrease'
    }</strong> from the previous month`
    : ''
}`;

export type ExtendedLabelWithSparklineProps<T> = {
  data: T[];
  toValue: (item: T) => number | undefined;
  combineValues: (item: T[]) => number;
  colorBy?: (values: (number | undefined)[]) => string;
  valueToLabel: (value: number) => string;
  renderer?: Renderer;
  tooltipLabel: string;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const LabelWithSparkline2 = <T extends {}>({
  data, toValue, colorBy, valueToLabel, renderer, combineValues, tooltipLabel
}: ExtendedLabelWithSparklineProps<T>) => {
  const thisMonthValue = useMemo(() => combineValues(data.slice(-4)), [combineValues, data]);

  const dataForSparkline = useMemo(() => data.map(toValue), [data, toValue]);

  const previousMonthStats: PreviousMonthStats = useMemo(() => {
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
    <span
      className="grid"
      data-tip={tooltip(tooltipLabel, valueToLabel(thisMonthValue), previousMonthStats)}
      data-html
    >
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
