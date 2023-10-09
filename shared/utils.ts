import { add, multiply, range } from 'rambda';
import { maybe } from './maybe.js';
import type { QualityGateStatus } from './types.js';

export type NonEmptyArray<T> = [T, ...T[]];

export const oneSecondInMs = 1000;
export const oneMinuteInMs = 60 * oneSecondInMs;
export const oneHourInMs = 60 * oneMinuteInMs;
export const oneDayInMs = 24 * oneHourInMs;
export const oneWeekInMs = 7 * oneDayInMs;
export const oneFortnightInMs = 15 * oneDayInMs;
export const oneMonthInMs = 30 * oneDayInMs;
export const oneYearInMs = 365 * oneDayInMs;

export const unique = <T>(xs: T[]) => [...new Set(xs)];

export const exists = <T>(x: T | undefined | null): x is T =>
  x !== null && x !== undefined;

export const divide = (numerator: number, denominator: number) =>
  maybe(numerator / denominator);

export const toPercentage = (value: number) => `${Math.round(value * 100)}%`;

export const combineColumnsInArray =
  <T>(combiner: (a: T, b: T) => T) =>
  (rows: T[][]) =>
    rows.reduce<T[]>((acc, row) => {
      row.forEach((val, index) => {
        acc[index] = combiner(acc[index], val);
      });
      return acc;
    }, []);

export const addColumnsInArray = combineColumnsInArray<number>((a, b) => add(a || 0, b));

export const mapObj =
  <T, U>(xform: (x: T) => U) =>
  (obj: Record<string, T>) =>
    Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, xform(value)]));

export const merge = <T>(obj1: T, obj2: T) => ({ ...obj1, ...obj2 });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <F extends (...x: any[]) => any>(fn: F, ms = 250) => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<F>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

export const weightedQualityGate = (qualityGateStatus: QualityGateStatus[]) => {
  if (qualityGateStatus.length === 0) return -1;
  const qualityGatesPassed = qualityGateStatus.filter(status => status !== 'fail');
  if (qualityGatesPassed.length === qualityGateStatus.length) return 100;
  return divide(qualityGatesPassed.length, qualityGateStatus.length)
    .map(multiply(100))
    .getOr(0);
};

export const shouldNeverReachHere = (x: never) => {
  throw new Error(`Should never reach here: ${x}`);
};

export const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const chunkArray = <T>(array: T[], chunkSize: number) =>
  range(0, Math.ceil(array.length / chunkSize)).map(i =>
    array.slice(i * chunkSize, (i + 1) * chunkSize)
  );
