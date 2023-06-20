import { add } from 'rambda';
import { maybe } from './maybe.js';

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
