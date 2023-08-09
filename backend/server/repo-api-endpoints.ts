import type { Request, Response, Router } from 'express';
import type { z } from 'zod';
import { getYAMLPipelinesForDownload } from '../models/repo-listing.js';
import { createXLSX } from './create-xlsx.js';
import { filteredReposInputParser } from '../models/active-repos.js';
import { getSonarProjectsForDownload } from '../models/sonar.js';
import { getTestsAndCoveragePipelinesForDownload } from '../models/testruns.js';
import { getBuildPipelineListForDownload } from '../models/builds.js';
import { capitalizeFirstLetter } from '../../shared/utils.js';

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
          value: x => new URL(x.repositoryUrl),
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
          title: 'Sonar project URL',
          value: x => (x.sonarProjectUrl ? new URL(x.sonarProjectUrl) : null),
        },
      ],
    });
  },
  'tests-coverage-pipelines': async (args: FilterArgs) => {
    const lines = await getTestsAndCoveragePipelinesForDownload(args);
    return createXLSX({
      data: lines,
      columns: [
        {
          title: 'Repo URL',
          value: x => (x.repositoryUrl ? new URL(x.repositoryUrl) : null),
        },
        {
          title: 'Repo Name',
          value: x => x.repositoryName ?? null,
        },
        {
          title: 'Pipeline Link',
          value: x => new URL(x.pipelineUrl),
        },
        {
          title: 'Pipeline Name',
          value: x => x.pipelineName,
        },
        {
          title: 'Total tests',
          value: x => x.totalTests,
        },
        {
          title: 'Passed tests',
          value: x => x.passedTests,
        },
        {
          title: 'Failed tests',
          value: x => x.failedTests,
        },
        {
          title: 'Branches covered',
          value: x => x.coveredBranches,
        },
        {
          title: 'Total branches',
          value: x => x.totalBranches,
        },
        {
          title: 'Coverage %',
          value: x => Number(x.totalCoverage.toFixed(0)),
        },
      ],
    });
  },
  'build-pipelines': async (args: FilterArgs) => {
    const lines = await getBuildPipelineListForDownload(args);
    return createXLSX({
      data: lines,
      columns: [
        {
          title: 'Repo URL',
          value: x => (x.repositoryUrl ? new URL(x.repositoryUrl) : null),
        },
        {
          title: 'Repo name',
          value: x => x.repositoryName ?? null,
        },
        {
          title: 'Pipeline link',
          value: x => new URL(x.pipelineUrl),
        },
        {
          title: 'Pipeline name',
          value: x => x.pipelineName,
        },
        {
          title: 'Pipeline type',
          value: x => x.pipelineType,
        },
        {
          title: 'Last run date',
          value: x => x.lastUsed,
        },
        {
          title: 'Latest build status',
          value: x =>
            x.latestBuildStatus === 'partiallySucceeded'
              ? 'Partially Succeeded'
              : x.latestBuildStatus
              ? capitalizeFirstLetter(x.latestBuildStatus)
              : null,
        },
        {
          title: 'Runs in the last 90 days',
          value: x => x.totalBuilds,
        },
        {
          title: 'Successful Builds',
          value: x => x.successfulBuilds,
        },
        {
          title: 'Success rate',
          value: x => x.successRate,
        },
        {
          title: 'Average duration',
          value: x => x.averageDuration,
        },
        {
          title: 'Central template runs',
          value: x => x.centralTemplateUsage,
        },
        {
          title: 'Pull requests',
          value: x => x.prsCount,
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
