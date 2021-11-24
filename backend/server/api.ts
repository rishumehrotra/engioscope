import Router from 'express-promise-router';
import split2 from 'split2';
import { join } from 'path';
import { promises as fs, createWriteStream, createReadStream } from 'fs';
import { Transform } from 'stream';
import uaParser from 'ua-parser-js';
import { doesFileExist } from '../utils';
import type { ParsedConfig } from '../scraper/parse-config';
import azure from '../scraper/network/azure';
import toUIWorkItem from '../scraper/stats-aggregators/work-item-revision';
import type { UIWorkItemRevision } from '../../shared/types';

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

export default (config: ParsedConfig) => {
  const { getWorkItemRevisions } = azure(config);
  const router = Router();

  const analyticsStream = createWriteStream(join(process.cwd(), 'analytics.csv'), {
    flags: 'a',
    encoding: 'utf8'
  });

  router.post('/api/log', async (req, res) => {
    try {
      const { event, pathname, search } = req.body;
      const ua = uaParser(req.headers['user-agent']);

      analyticsStream.write(`${[
        new Date().toISOString(),
        req.cookies.c,
        event,
        pathname + search,
        ua.browser.name,
        ua.browser.version,
        ua.os.name,
        ua.os.version
      ].join(', ')}\n`);
    } catch (e) {
    // eslint-disable-next-line no-console
      console.error('Error writing analytics ping', e);
    }

    res.status(200).send('all your base are belong to us');
  });

  router.get('/api/analytics', async (req, res) => {
    const groups = getAnalyticsGroups();
    const minDate = groups[groups.length - 1].start;

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

    createReadStream(join(process.cwd(), 'analytics.csv'))
      .pipe(split2())
      .pipe(new Transform({
        objectMode: true,
        transform(line, _, next) {
          const [
            date,
            userId,
            event,
            pathname,
            browser,
            browserVersion,
            os,
            osVersion
          ] = line.split(',');

          if (new Date(date) < minDate) return next();

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
              .sort((a, b) => b.count - a.count)
              .slice(0, 20)
          }))));
        }
      }))
      .pipe(res);
    // res.end('Done');
  });

  router.get('/api/:collectionName/work-item-revisions', async (req, res) => {
    const { collectionName } = req.params;
    const { ids } = req.query;

    if (!ids || typeof ids !== 'string') {
      return res.status(400).send('Missing id');
    }

    const revisions = (await Promise.all(
      ids
        .split(',')
        .map(async id => ({
          [id]: toUIWorkItem(await getWorkItemRevisions(collectionName)(Number(id)))
        }))
    )).reduce<Record<number, UIWorkItemRevision[]>>((acc, curr) => Object.assign(acc, curr), {});

    res.status(200).send(revisions);
  });

  router.get('/api/*', async (req, res) => {
    const fileName = decodeURIComponent(req.path.replace('/api/', ''));
    const filePath = join(process.cwd(), 'data', fileName);

    if (!(await doesFileExist(filePath))) {
      res.status(404);
      res.send('404 - Not found');
      return;
    }

    res.status(200);
    res.setHeader('Content-type', 'application/json');
    res.send(await fs.readFile(filePath, { encoding: 'utf-8' }));
  });

  return router;
};
