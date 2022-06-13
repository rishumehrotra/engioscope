import {
  compose,
  equals,
  identity, last, not, prop, sum
} from 'rambda';
import { divide, exists, toPercentage } from '../../shared/utils';
import { num, prettyMS } from '../helpers/utils';
import type { ExtendedLabelWithSparklineProps } from './graphs/ExtendedLabelWithSparkline';
import { pathRendererSkippingUndefineds } from './graphs/sparkline-renderers';
import { decreaseIsBetter, increaseIsBetter } from './summary-page/utils';

type SparklinePropsWithoutData<T> = Omit<ExtendedLabelWithSparklineProps<T>, 'data'>;

const sparklineAsNumber = {
  toValue: identity,
  combineValues: sum,
  valueToLabel: num
};

const increaseIsBetterStrippingUndefineds = (values: (number | undefined)[]) => (
  increaseIsBetter(values.filter(exists))
);

// const decreaseIsBetterStrippingUndefineds = (values: (number | undefined)[]) => (
//   decreaseIsBetter(values.filter(exists))
// );

const notZero = compose(not, equals(0));

const decreaseIsBetterStrippingZerosAndUndefineds = (values: (number | undefined)[]) => (
  decreaseIsBetter(values.filter(exists).filter(notZero))
);

const averageOfTimes = (value: number[]) => divide(sum(value), value.length);
const excludeUndefinedsAndAverage = (values: (number | undefined)[][]) => (
  averageOfTimes(values.flat().filter(exists).filter(notZero)).getOr(0)
);
export const newItemsSparkline: SparklinePropsWithoutData<number> = {
  colorBy: increaseIsBetterStrippingUndefineds,
  tooltipLabel: 'new work items',
  ...sparklineAsNumber
};

export const newBugsSparkline: SparklinePropsWithoutData<number> = {
  colorBy: decreaseIsBetterStrippingZerosAndUndefineds,
  tooltipLabel: 'new bugs',
  ...sparklineAsNumber
};

export const velocitySparkline = newItemsSparkline;

export const cycleTimeSparkline: SparklinePropsWithoutData<number[]> = {
  colorBy: decreaseIsBetterStrippingZerosAndUndefineds,
  toValue: x => averageOfTimes(x).getOr(undefined),
  combineValues: excludeUndefinedsAndAverage,
  valueToLabel: x => (x === 0 ? '-' : prettyMS(x)),
  renderer: pathRendererSkippingUndefineds,
  tooltipLabel: 'cycle time'
};

export const changeLeadTimeSparkline = {
  ...cycleTimeSparkline,
  tooltipLabel: 'change lead time'
};

const addNumeratorsAndDenominators = <T>(
  numerator: (x: T) => number,
  denominator: (x: T) => number
) => (values: T[]) => (
  values.reduce((acc, x) => {
    acc.numerator += numerator(x);
    acc.denominator += denominator(x);
    return acc;
  }, { numerator: 0, denominator: 0 })
);

const averageOfFractions = <T>(
  numerator: (x: T) => number,
  denominator: (x: T) => number
) => (values: T[]) => {
  const { numerator: n, denominator: d } = addNumeratorsAndDenominators(numerator, denominator)(values);
  return divide(n, d);
};

export const flowEfficiencySparkline: SparklinePropsWithoutData<{ wcTime: number; total: number }> = {
  colorBy: increaseIsBetterStrippingUndefineds,
  toValue: x => divide(x.wcTime, x.total).getOr(0),
  combineValues: x => averageOfFractions<{ wcTime: number; total: number}>(prop('wcTime'), prop('total'))(x).getOr(0),
  valueToLabel: toPercentage,
  tooltipLabel: 'flow efficiency'
};

export const testAutomationSparkline: SparklinePropsWithoutData<number> = {
  colorBy: increaseIsBetterStrippingUndefineds,
  combineValues: x => last(x) || 0,
  toValue: identity,
  valueToLabel: num,
  tooltipLabel: 'automated tests'
};

export const coverageSparkline: SparklinePropsWithoutData<number> = {
  colorBy: increaseIsBetterStrippingUndefineds,
  combineValues: x => last(x) || 0,
  toValue: identity,
  valueToLabel: x => `${x}%`,
  tooltipLabel: 'branch coverage'
};

export const newSonarSetupsSparkline = (repoCount: number): SparklinePropsWithoutData<number> => ({
  colorBy: increaseIsBetterStrippingUndefineds,
  combineValues: x => last(x) || 0,
  toValue: identity,
  valueToLabel: x => divide(x, repoCount).map(toPercentage).getOr('-'),
  tooltipLabel: 'repos with sonar'
});

export const buildRunsSparkline: SparklinePropsWithoutData<number> = {
  colorBy: increaseIsBetterStrippingUndefineds,
  ...sparklineAsNumber,
  tooltipLabel: 'builds'
};
