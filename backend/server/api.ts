import Router from 'express-promise-router';
import { join } from 'path';
import { promises as fs, createWriteStream } from 'fs';
import uaParser from 'ua-parser-js';
import { doesFileExist } from '../utils';
import type { Config } from '../scraper/types';
import azure from '../scraper/network/azure';
import toUIWorkItem from '../scraper/stats-aggregators/work-item-revision';
import type { UIWorkItemRevision } from '../../shared/types';

export default (config: Config) => {
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
    )).reduce<Record<number, UIWorkItemRevision[]>>((acc, curr) => ({ ...acc, ...curr }), {});

    res.status(200).send(revisions);
  });

  router.get('/api/*', async (req, res) => {
    const fileName = decodeURIComponent(req.path.replace('/api/', ''));
    const filePath = join(process.cwd(), 'data', fileName);

    if (!await doesFileExist(filePath)) {
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
