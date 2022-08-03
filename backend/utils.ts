// Not sure why the /// <referennce ... /> is needed, but tsc fails without it
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../node_modules/@types/node/fs.d.ts" />

import { promises as fs } from 'fs';
import ms from 'ms';
import { allPass, compose, not } from 'rambda';
import type { ParsedConfig } from './scraper/parse-config.js';

export const pastDate = (past?: string) => {
  if (!past) return new Date();

  const d = new Date();
  d.setMilliseconds(d.getMilliseconds() - ms(past));
  return d;
};

export const isAfter = (time: string) => (date: Date) => (
  date.getTime() > pastDate(time).getTime()
);
export const isWithin = (time: string) => (date: Date) => (
  date.getTime() <= pastDate(time).getTime()
);

export const isNewerThan = (date1: Date) => (date2: Date) => (
  date2.getTime() > date1.getTime()
);

export const shortDateFormat = (date: Date) => [
  date.toLocaleString('default', { month: 'short' }),
  date.getDate()
].join(' ');

export const isMaster = (branchName: string) => [
  'refs/heads/master', 'refs/heads/main'
].includes(branchName);

export const normalizeBranchName = (branchName: string) => branchName.replace('refs/heads/', '');

export const doesFileExist = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (e) {
    return false;
  }
};

export const range = (num: number) => [...Array(num).keys()];

export const chunkArray = <T>(array: T[], chunkSize: number) => (
  range(Math.ceil(array.length / chunkSize))
    .map(i => array.slice(i * chunkSize, (i + 1) * chunkSize))
);

export const unique = <T>(xs: T[]) => [...new Set(xs)];

const weekNumbers = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export const weekLimits = weekNumbers
  .map(weekNumber => [
    pastDate(`${weekNumber * 7} days`),
    pastDate(`${(weekNumber - 1) * 7} days`)
  ] as const);

export const weeks = weekNumbers
  .map(weekNumber => allPass([
    isAfter(`${weekNumber * 7} days`),
    compose(not, isAfter(`${(weekNumber - 1) * 7} days`))
  ]));

type SettleSeriesType<T> = {
  status: 'fulfilled';
  value: T;
} | {
  status: 'rejected';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reason: any;
};

export const mapSettleSeries = <T, U>(xs: T[], fn: (x: T) => Promise<U>) => (
  xs.reduce<Promise<SettleSeriesType<U>[]>>((acc, x) => (
    acc.then(accArr => (
      fn(x)
        .then(value => ({ status: 'fulfilled', value } as const))
        .catch(err => ({ status: 'rejected', reason: err } as const))
        .then(result => [...accArr, result])
    ))
  ), Promise.resolve([]))
);

export const startTimer = () => {
  const start = Date.now();
  return () => `${(Date.now() - start) / 1000}s`;
};

export const queryPeriodDays = (config: ParsedConfig) => Math.round(
  (Date.now() - config.azure.queryFrom.getTime()) / (1000 * 60 * 60 * 24)
);

export const wait = (ms: number) => new Promise(resolve => { setTimeout(resolve, ms); });

export const retry = <T>(fn: () => Promise<T>, { retryCount = 10, waitTime = 1 } = {}): Promise<T> => (
  fn().catch(async err => {
    if (retryCount <= 0) throw err;
    await wait(waitTime * 1000);
    return retry(fn, { retryCount: retryCount - 1, waitTime });
  })
);
