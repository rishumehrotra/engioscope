import { createReadStream } from 'fs';
import { join } from 'path';
import { Transform } from 'stream';
import split2 from 'split2';
import { prop } from 'rambda';
import { byNum, desc } from '../../shared/sort-utils.js';

type AnalyticsItem = {
  date: Date;
  userId: string;
  event: string;
  pathname: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
};

type AnalyticsGroup = {
  label: string;
  start: Date;
  end: Date;
  pageLoads: number;
  uniques: Map<string, number>;
  pages: Map<string, number>;
};

const reduceStream = <T, U>(fn: (acc: T, value: U) => T, acc: T, options = {}) => {
  let internalAcc = acc;

  return new Transform({
    objectMode: true,
    ...options,

    transform(chunk, encoding, callback) {
      try {
        internalAcc = fn(internalAcc, chunk);
      } catch (e) {
        return callback(e as Error);
      }
      return callback();
    },

    flush(callback) {
      callback(null, internalAcc);
    }
  });
};

const getAnalyticsGroups = () => {
  const now = new Date();
  return [
    {
      label: 'Today',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    },
    {
      label: 'Yesterday',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate())
    },
    {
      label: 'Last 7 days',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    },
    {
      label: 'Last 30 days',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    }
  ];
};

export default () => {
  const groups = getAnalyticsGroups();
  const minDate = groups[groups.length - 1].start;

  return (
    createReadStream(join(process.cwd(), 'analytics.csv'))
      .pipe(split2())
      .pipe(new Transform({
        objectMode: true,
        transform(line, _, next) {
          const [
            date, userId, event, pathname, browser, browserVersion, os, osVersion
          ] = line.split(',');

          if (new Date(date) < minDate) { return next(); }

          next(null, {
            date: new Date(date),
            userId: userId.trim(),
            event: event.trim(),
            pathname: pathname.trim(),
            browser: browser.trim(),
            browserVersion: browserVersion.trim(),
            os: os.trim(),
            osVersion: osVersion.trim()
          } as AnalyticsItem);
        }
      }))
      .pipe(reduceStream<AnalyticsGroup[], AnalyticsItem>(
        (acc, value) => acc.map(group => {
          if (group.start <= value.date && value.date < group.end) {
            group.pageLoads += 1;
            group.uniques.set(value.userId, (group.uniques.get(value.userId) || 0) + 1);
            group.pages.set(value.pathname, (group.pages.get(value.pathname) || 0) + 1);
          }

          return group;
        }),
        groups.map(group => ({
          label: group.label,
          start: group.start,
          end: group.end,
          pageLoads: 0,
          uniques: new Map(),
          pages: new Map()
        }))
      ))
      .pipe(new Transform({
        objectMode: true,
        transform(chunk, _, next) {
          next(null, JSON.stringify((chunk as AnalyticsGroup[]).map(group => ({
            ...group,
            uniques: Array.from(group.uniques.values()).length,
            pages: Array.from(group.pages.entries())
              .map(([pathname, count]) => ({ pathname, count }))
              .sort(desc(byNum(prop('count'))))
              .slice(0, 20)
          }))));
        }
      }))
  );
};
