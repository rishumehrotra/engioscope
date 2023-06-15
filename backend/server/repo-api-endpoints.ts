import type { Request, Response, Router } from 'express';
import type { z } from 'zod';
import {
  filteredReposInputParser,
  getYAMLPipelinesForDownload,
} from '../models/repo-listing.js';
import { createXLSX } from './create-xlsx.js';

export type RequestWithFilter = Request<
  {
    collectionName: string;
    project: string;
  },
  object,
  object,
  {
    startDate: string;
    endDate: string;
    search: string | undefined;
    groupsIncluded: string | undefined;
  }
>;

export const parseSummaryInput = (req: RequestWithFilter) => {
  return filteredReposInputParser.parse({
    queryContext: [
      req.params.collectionName,
      req.params.project,
      req.query.startDate && new Date(req.query.startDate),
      req.query.endDate && new Date(req.query.endDate),
    ],
    searchTerms: req.query.search ? [req.query.search] : undefined,
    groupsIncluded: req.query.groupsIncluded?.split(','),
  });
};

const sendBufferAsXls = (res: Response, buffer: Buffer, fileName: string) => {
  res.writeHead(200, [
    ['Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['Content-Disposition', `attachment; filename=${fileName}.xlsx`],
  ]);
  res.end(buffer);
};

type FilterArgs = z.infer<typeof filteredReposInputParser>;
const drawerDownloads = {
  'yaml-pipelines': async (args: FilterArgs) => {
    const lines = await getYAMLPipelinesForDownload(args);
    return createXLSX({
      data: lines,
      columns: [
        {
          title: 'URL',
          value: x => new URL(x.url),
        },
        {
          title: 'Pipeline name',
          value: x => x.name,
        },
        {
          title: 'Repo name',
          value: x => x.repoName,
        },
        {
          title: 'Pipeline type',
          value: x => (x.yaml ? 'YAML' : 'UI'),
        },
        {
          title: 'Runs in the last 90 days',
          value: x => x.runCount,
        },
        {
          title: 'Last run date',
          value: x => x.lastRun,
        },
      ],
    });
  },
} as const;

export type DrawerDownloadSlugs = keyof typeof drawerDownloads;

export default (router: Router) => {
  Object.entries(drawerDownloads).forEach(([slug, handler]) => {
    router.get(
      `/api/:collectionName/:project/repos/${slug}`,
      async (req: RequestWithFilter, res) => {
        const args = parseSummaryInput(req);
        const buffer = await handler(args);
        return sendBufferAsXls(res, buffer, slug);
      }
    );
  });
};
