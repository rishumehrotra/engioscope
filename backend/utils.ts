// Not sure why the /// <referennce ... /> is needed, but tsc fails without it
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../node_modules/@types/node/fs.d.ts" />

import { promises as fs } from 'fs';
import ms from 'ms';
import { allPass, compose, not } from 'rambda';

export const pastDate = (past?: string) => {
  if (!past) return new Date();

  const d = new Date();
  d.setMilliseconds(d.getMilliseconds() - ms(past));
  return d;
};

export const isAfter = (time: string) => (date: Date) => date > pastDate(time);
export const isWithinFortnight = isAfter('15 days');

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

export const exists = <T>(x: T | undefined | null): x is T => (
  x !== null && x !== undefined
);

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

export const weeks = [4, 3, 2, 1]
  .map(weekIndex => allPass([
    isAfter(`${weekIndex * 7} days`),
    compose(not, isAfter(`${(weekIndex - 1) * 7} days`))
  ]));
