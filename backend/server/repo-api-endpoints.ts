import type { Request, Response, Router } from 'express';
import type { z } from 'zod';
import { getYAMLPipelinesForDownload } from '../models/repo-listing.js';
import { createXLSX } from './create-xlsx.js';
import { filteredReposInputParser } from '../models/active-repos.js';
import { getSonarProjectsForDownload } from '../models/sonar.js';

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
    teams: string | undefined;
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
    searchTerms: req.query.search ? req.query.search.split(',') : undefined,
    groupsIncluded: req.query.groupsIncluded?.split(','),
    teams: req.query.teams?.split(','),
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
  'sonar-projects': async (args: FilterArgs) => {
    const lines = await getSonarProjectsForDownload(args);
    return createXLSX({
      data: lines,
      columns: [
        {
          title: 'Repo URL',
          value: x => x.repositoryUrl,
        },
        {
          title: 'Repo name',
          value: x => x.repositoryName,
        },
        {
          title: 'Sonar project name',
          value: x => x.sonarProjectName,
        },
        {
          title: 'Code quality status',
          value: x => x.status,
        },
        {
          title: 'URL',
          value: x => (x.url ? new URL(x.url) : 'N/A'),
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
