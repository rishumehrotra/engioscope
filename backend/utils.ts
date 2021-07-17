import ms from 'ms';
import { promises as fs } from 'fs';

const oneMinute = 1000 * 60;
const oneHour = oneMinute * 60;

export const pastDate = (past?: string) => {
  if (!past) return new Date();

  const d = new Date();
  d.setMilliseconds(d.getMilliseconds() - ms(past));
  return d;
};

const isWithin = (time: string) => (date: Date) => date > pastDate(time);
export const isWithinFortnight = isWithin('15 days');

/* eslint-disable @typescript-eslint/indent */
export const statsStrings = (emptyValue: string, transform: (a: number) => string):
  [range: (a: number[]) => string, average: (a: number[]) => string] => {
  const rangeAsString = (arr: number[]) => {
    switch (arr.length) {
      case 0: return emptyValue;
      case 1: return transform(arr[0]);
      default: return `${transform(Math.min(...arr))} - ${transform(Math.max(...arr))}`;
    }
  };

  const averageAsString = (arr: number[]) => {
    if (arr.length === 0) return emptyValue;
    return transform(arr.reduce((a, b) => a + b, 0) / arr.length);
  };

  return [rangeAsString, averageAsString];
};
/* eslint-enable @typescript-eslint/indent */

export const minutes = (ms: number) => {
  const m = Math.ceil(ms / oneMinute);
  if (m <= 1) return '1 m';
  return `${m} m`;
};

export const hours = (ms: number) => {
  const h = Math.round(ms / oneHour);
  if (h === 1) return '1 h';
  return `${h.toFixed(1)} h`;
};

export const shortDateFormat = (date: Date) => [
  date.toLocaleString('default', { month: 'short' }),
  date.getDate()
].join(' ');

export const isMaster = (branchName: string) => [
  'refs/heads/master', 'refs/heads/main'
].includes(branchName);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const assertDefined = <T>(x: T | undefined) => x!;

export const divideBy = (divisor: number) => (dividend: number) => dividend / divisor;
export const getFirst = <T>(list: T[]): T | undefined => list[0];
export const map = <T, R>(fn: (x: T) => R) => ((xs: T[]) => xs.map(fn));
export const filter = <T>(fn: (x: T) => boolean) => (xs: T[]) => xs.filter(fn);

export const doesFileExist = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (e) {
    return false;
  }
};
