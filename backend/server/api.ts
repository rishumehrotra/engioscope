import Router from 'express-promise-router';
import { join } from 'node:path';
import { promises as fs, createReadStream } from 'node:fs';
import type { Request } from 'express';
import { doesFileExist } from '../utils.js';
import type { ParsedConfig } from '../scraper/parse-config.js';
import azure from '../scraper/network/azure.js';
import toUIWorkItem from '../scraper/stats-aggregators/work-item-revision.js';
import type { PipelineDefinitions, UIWorkItemRevision } from '../../shared/types.js';
import { formatReleaseDefinition } from '../scraper/stats-aggregators/releases.js';
import saveBuildReport from './save-build-report.js';
import { getReleaseEnvironments } from '../models/release-definitions.js';
import { trpcExpressHandler } from './router/index.js';
import {
  getSummaryInputParser,
  sendSummaryAsEventStream,
} from '../models/repo-listing.js';

export default (config: ParsedConfig) => {
  const { getWorkItemRevisions } = azure(config);
  const router = Router();

  router.use('/api/rpc', trpcExpressHandler);

  router.post('/api/azure-build-report', saveBuildReport);

  router.get('/api/ui-version', (req, res) => {
    res.send(process.env.npm_package_version);
  });

  router.get('/api/dump', (req, res) => {
    const filePath = join(process.cwd(), 'data', 'dump.gz');
    res.setHeader('Content-type', 'application/gzip');
    createReadStream(filePath).pipe(res);
  });

  router.get('/api/:collectionName/work-item-revisions', async (req, res) => {
    const { collectionName } = req.params;
    const { ids } = req.query;

    if (!ids || typeof ids !== 'string') {
      return res.status(400).send('Missing id');
    }

    const revisions = (
      await Promise.all(
        ids.split(',').map(async id => ({
          [id]: toUIWorkItem(await getWorkItemRevisions(collectionName)(Number(id))),
        }))
      )
    ).reduce<Record<number, UIWorkItemRevision[]>>(
      (acc, curr) => Object.assign(acc, curr),
      {}
    );

    res.status(200).send(revisions);
  });

  router.get(
    '/api/:collectionName/:projectName/release-definitions',
    async (req, res) => {
      const { collectionName, projectName } = req.params;
      const { ids } = req.query;

      if (!ids || typeof ids !== 'string') {
        return res.status(400).send('Missing id');
      }

      const releases = (
        await Promise.all(
          ids.split(',').map(async id => ({
            [id]: formatReleaseDefinition(
              (await getReleaseEnvironments(collectionName, projectName, Number(id))) ||
                []
            ),
          }))
        )
      ).reduce<PipelineDefinitions>((acc, curr) => ({ ...acc, ...curr }), {});

      res.status(200).send(releases);
    }
  );

  router.get(
    `/api/:collectionName/:project/repos/summary`,
    (
      req: Request<
        { collectionName: string; project: string },
        object,
        object,
        {
          startDate: string;
          endDate: string;
          searchTerm: string | undefined;
          selectedGroupLabels: string | undefined;
        }
      >,
      res
    ) => {
      const args = getSummaryInputParser.parse({
        queryContext: [
          req.params.collectionName,
          req.params.project,
          req.query.startDate && new Date(req.query.startDate),
          req.query.endDate && new Date(req.query.endDate),
        ],
        searchTerm: req.query.searchTerm || undefined,
        groupsIncluded: req.query.selectedGroupLabels,
      });
      return sendSummaryAsEventStream(args, res, res.flush);
    }
  );

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
