import Router from 'express-promise-router';
import { join } from 'node:path';
import { promises as fs, createWriteStream, createReadStream } from 'node:fs';
import uaParser from 'ua-parser-js';
import { doesFileExist } from '../utils.js';
import type { ParsedConfig } from '../scraper/parse-config.js';
import azure from '../scraper/network/azure.js';
import toUIWorkItem from '../scraper/stats-aggregators/work-item-revision.js';
import type { PipelineDefinitions, UIWorkItemRevision } from '../../shared/types.js';
import analytics from './analytics.js';
import { formatReleaseDefinition } from '../scraper/stats-aggregators/releases.js';
import saveBuildReport from './save-build-report.js';

export default (config: ParsedConfig) => {
  const { getWorkItemRevisions, getReleaseDefinition } = azure(config);
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error writing analytics ping', error);
    }

    res.status(200).send('all your base are belong to us');
  });

  router.post('/api/azure-build-report', saveBuildReport);

  router.get('/api/an', async (req, res) => {
    analytics().pipe(res);
  });

  router.get('/api/ui-version', async (req, res) => {
    res.send(process.env.npm_package_version);
  });

  router.post('/api/ft', async (req, res) => {
    req.pipe(createWriteStream(join(process.cwd(), 'ft.json')));
    req.on('end', () => { res.send(202); });
    req.on('error', () => { res.send(598); });
  });

  router.get('/api/cache', async (req, res) => {
    const filePath = join(process.cwd(), 'data', 'cache.tar.gz');
    res.setHeader('Content-type', 'application/gzip');
    createReadStream(filePath).pipe(res);
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

  router.get('/api/:collectionName/:projectName/release-definitions', async (req, res) => {
    const { collectionName, projectName } = req.params;
    const { ids } = req.query;

    if (!ids || typeof ids !== 'string') {
      return res.status(400).send('Missing id');
    }

    const releases = (await Promise.all(
      ids
        .split(',')
        .map(async id => ({
          [id]: formatReleaseDefinition(await getReleaseDefinition(collectionName, projectName, Number(id)))
        }))
    )).reduce<PipelineDefinitions>((acc, curr) => ({ ...acc, ...curr }), {});

    res.status(200).send(releases);
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
    res.send(await fs.readFile(filePath, { encoding: 'utf8' }));
  });

  return router;
};
