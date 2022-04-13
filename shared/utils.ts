import { maybe } from './maybe';

export const exists = <T>(x: T | undefined | null): x is T => (
  x !== null && x !== undefined
);

export const divide = (numerator: number, denominator: number) => (
  maybe(numerator / denominator)
);

export const toPercentage = (value: number) => `${Math.round(value * 100)}%`;
