import { add } from 'rambda';
import { maybe } from './maybe';

export const exists = <T>(x: T | undefined | null): x is T => (
  x !== null && x !== undefined
);

export const divide = (numerator: number, denominator: number) => (
  maybe(numerator / denominator)
);

export const toPercentage = (value: number) => `${Math.round(value * 100)}%`;

export const combineColumnsInArray = <T>(combiner: (a: T, b: T) => T) => (rows: T[][]) => (
  rows.reduce<T[]>((acc, row) => {
    row.forEach((val, index) => {
      acc[index] = combiner(acc[index], val);
    });
    return acc;
  }, [])
);

export const addColumnsInArray = combineColumnsInArray<number>((a, b) => add(a || 0, b));
