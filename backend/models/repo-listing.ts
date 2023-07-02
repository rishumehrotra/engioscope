import { z } from 'zod';
import { prop, propEq, intersection, length } from 'rambda';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import {
  getHealthyBranchesSummary,
  getTotalBranchesForRepositoryIds,
} from './branches.js';
import { getSuccessfulBuildsBy, getTotalBuildsBy } from './build-listing.js';
import {
  getTotalCentralTemplateUsage,
  getCentralTemplateBuildDefs,
  getActivePipelineCentralTemplateBuilds,
} from './build-reports.js';
import {
  getAllRepoDefaultBranchIDs,
  getDefaultBranchAndNameForRepoIds,
  getReposSortedByBranchesCount,
  getReposSortedByBuildCount,
  getReposSortedByCommitsCount,
  getReposSortedByPullRequestsCount,
} from './repos.js';
import {
  getHasReleasesSummary,
  getReposConformingToBranchPolicies,
  releaseBranchesForRepo,
} from './release-listing.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import {
  getCoveragesByWeek,
  getReposSortedByTests,
  getTestsByWeek,
  getTotalTestsForRepositoryIds,
  getTestsAndCoveragesCount,
} from './testruns.js';
import { getActivePipelineBuilds, getTotalBuildsForRepositoryIds } from './builds.js';
import { getTotalCommitsForRepositoryIds } from './commits.js';
import {
  getReposSortedByCodeQuality,
  getReposWithSonarQube,
  getSonarProjectsCount,
  getSonarQualityGateStatusForRepoIds,
  updateWeeklySonarProjectCount,
  updatedWeeklyReposWithSonarQubeCount,
} from './sonar.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';
import { getTotalPullRequestsForRepositoryIds } from './pull-requests.js';
import { pipelineCountForRepo } from './releases.js';
import { getActivePipelineIds } from './build-definitions.js';
import {
  filteredReposInputParser,
  getActiveRepos,
  searchAndFilterReposBy,
} from './active-repos.js';

const pipelineUrlForUI = (url: string) =>
  url
    .replace('/_apis/build/Definitions/', '/_build?definitionId=')
    .replace(/\?revision=.*/, '');

export const getYamlPipelinesCountSummary = async (
  queryContext: QueryContext,
  repoIds?: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  const result = await BuildDefinitionModel.aggregate<{
    totalCount: number;
    yamlCount: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        ...(repoIds ? { repositoryId: { $in: repoIds } } : {}),
      },
    },
    {
      $group: {
        _id: { collectionName: '$collectionName', project: '$project' },
        totalCount: { $sum: 1 },
        yamlCount: {
          $sum: {
            $cond: {
              if: { $eq: ['$process.processType', 2] },
              then: 1,
              else: 0,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalCount: 1,
        yamlCount: 1,
      },
    },
  ]);

  return result[0] || { totalCount: 0, yamlCount: 0 };
};
export const getCentralTemplatePipeline = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  const centralTemplateBuildDefs = await getCentralTemplateBuildDefs(
    collectionName,
    project
  );

  const buildDefinitionId = centralTemplateBuildDefs?.map(
    buildDef => buildDef.buildDefinitionId
  );

  const result = await BuildDefinitionModel.aggregate<{ buildDefinitionId: number }>([
    {
      $match: {
        collectionName,
        project,
        ...(repoIds ? { repositoryId: { $in: repoIds } } : {}),
        ...(buildDefinitionId ? { id: { $in: buildDefinitionId } } : {}),
      },
    },
    {
      $lookup: {
        from: 'repositories',
        let: {
          repositoryId: '$repositoryId',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              'project.name': project,
              '$expr': {
                $eq: ['$id', '$$repositoryId'],
              },
            },
          },
          {
            $project: {
              name: 1,
              defaultBranch: 1,
            },
          },
        ],
        as: 'repo',
      },
    },
    {
      $addFields: {
        defaultBranch: { $arrayElemAt: ['$repo.defaultBranch', 0] },
      },
    },
    {
      $project: {
        _id: 0,
        collectionName: 1,
        project: 1,
        repositoryId: 1,
        buildDefinitionId: '$id',
        buildDefinitionName: '$name',
        defaultBranch: 1,
      },
    },
    {
      $lookup: {
        from: 'builds',
        let: {
          repositoryId: '$repositoryId',
          buildDefinitionId: '$buildDefinitionId',
          defaultBranch: '$defaultBranch',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repository.id', '$$repositoryId'] },
                  { $eq: ['$definition.id', '$$buildDefinitionId'] },
                  { $eq: ['$sourceBranch', '$$defaultBranch'] },
                ],
              },
            },
          },
          { $sort: { finishTime: -1 } },
          { $limit: 1 },
          { $project: { sourceBranch: 1 } },
        ],
        as: 'builds',
      },
    },
    {
      $addFields: {
        sourceBranch: { $arrayElemAt: ['$builds.sourceBranch', 0] },
      },
    },
    {
      $match: {
        $expr: {
          $and: [
            { $ne: ['$defaultBranch', null] },
            { $ne: ['$sourceBranch', null] },
            { $eq: ['$sourceBranch', '$defaultBranch'] },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        buildDefinitionId: 1,
      },
    },
  ]);

  return {
    total: centralTemplateBuildDefs.reduce(
      (total, build) => total + build.centralTemplateBuilds,
      0
    ),
    central: result.length,
    idsWithMainBranchBuilds: result.map(r => r.buildDefinitionId),
  };
};

export const getFilteredReposCount = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  return searchAndFilterReposBy({
    queryContext,
    searchTerms,
    groupsIncluded,
    teams,
  }).then(length);
};

export type SummaryStats = {
  totalActiveRepos: number;
  totalRepos: number;
  hasReleasesReposCount: number;
  reposWithSonarQube: number;
  centralTemplateUsage: Awaited<ReturnType<typeof getTotalCentralTemplateUsage>>;
  pipelines: Awaited<ReturnType<typeof getYamlPipelinesCountSummary>>;
  healthyBranches: Awaited<ReturnType<typeof getHealthyBranchesSummary>>;
  totalBuilds: Awaited<ReturnType<typeof getTotalBuildsBy>>;
  successfulBuilds: Awaited<ReturnType<typeof getSuccessfulBuildsBy>>;
  centralTemplatePipeline: Omit<
    Awaited<ReturnType<typeof getCentralTemplatePipeline>>,
    'idsWithMainBranchBuilds'
  >;
  defSummary: Awaited<ReturnType<typeof getTestsAndCoveragesCount>>;
  weeklyTestsSummary: Awaited<ReturnType<typeof getTestsByWeek>>;
  weeklyCoverageSummary: Awaited<ReturnType<typeof getCoveragesByWeek>>;
  sonarProjects: Awaited<ReturnType<typeof getSonarProjectsCount>>;
  weeklySonarProjectsCount: Awaited<ReturnType<typeof updateWeeklySonarProjectCount>>;
  weeklyReposWithSonarQubeCount: Awaited<
    ReturnType<typeof updatedWeeklyReposWithSonarQubeCount>
  >;
  branchPolicies: Awaited<ReturnType<typeof getReposConformingToBranchPolicies>>;
  activePipelinesCount: number;
  activePipelineWithCentralTemplateCount: number;
  activePipelineCentralTemplateBuilds: Awaited<
    ReturnType<typeof getActivePipelineCentralTemplateBuilds>
  >;
  activePipelineBuilds: Awaited<ReturnType<typeof getActivePipelineBuilds>>;
};

export const getSummaryAsChunks = async (
  {
    queryContext,
    searchTerms,
    groupsIncluded,
    teams,
  }: z.infer<typeof filteredReposInputParser>,
  onChunk: (x: Partial<SummaryStats>) => void
) => {
  const sendChunk =
    <T extends keyof SummaryStats>(key: T) =>
    (data: SummaryStats[typeof key]) => {
      onChunk({ [key]: data });
    };

  const { collectionName, project } = fromContext(queryContext);

  const activeRepos = await getActiveRepos(
    queryContext,
    searchTerms,
    groupsIncluded,
    teams
  );

  const activeRepoIds = activeRepos.map(prop('id'));
  const activeRepoNames = activeRepos.map(prop('name'));

  sendChunk('totalActiveRepos')(activeRepoIds.length);

  const defaultBranchIDs = await getAllRepoDefaultBranchIDs(
    collectionName,
    project,
    activeRepoIds
  );

  const activePipelineIdsPromise = getActivePipelineIds(queryContext, activeRepoIds);
  const centralTemplatePipelinePromise = getCentralTemplatePipeline(
    queryContext,
    activeRepoIds
  );

  const activePipelineWithCentralTemplateCountPromise = Promise.all([
    activePipelineIdsPromise,
    centralTemplatePipelinePromise,
  ]).then(([activePipelineIds, centralTemplatePipeline]) => {
    return intersection(
      activePipelineIds,
      centralTemplatePipeline.idsWithMainBranchBuilds
    ).length;
  });

  await Promise.all([
    getSuccessfulBuildsBy(queryContext, activeRepoIds).then(
      sendChunk('successfulBuilds')
    ),
    getTotalBuildsBy(queryContext, activeRepoIds).then(sendChunk('totalBuilds')),
    getTotalCentralTemplateUsage(queryContext, activeRepoNames).then(
      sendChunk('centralTemplateUsage')
    ),
    getYamlPipelinesCountSummary(queryContext, activeRepoIds).then(
      sendChunk('pipelines')
    ),
    getHealthyBranchesSummary(queryContext, activeRepoIds, defaultBranchIDs).then(
      sendChunk('healthyBranches')
    ),
    getHasReleasesSummary(queryContext, activeRepoIds).then(
      sendChunk('hasReleasesReposCount')
    ),
    centralTemplatePipelinePromise
      .then(x => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { idsWithMainBranchBuilds, ...rest } = x;
        return rest;
      })
      .then(sendChunk('centralTemplatePipeline')),
    getTestsAndCoveragesCount(queryContext, activeRepoIds).then(sendChunk('defSummary')),
    getTestsByWeek(queryContext, activeRepoIds).then(sendChunk('weeklyTestsSummary')),
    getCoveragesByWeek(queryContext, activeRepoIds).then(
      sendChunk('weeklyCoverageSummary')
    ),
    searchAndFilterReposBy({ queryContext, searchTerms, groupsIncluded, teams }).then(x =>
      sendChunk('totalRepos')(x.length)
    ),
    getSonarProjectsCount(collectionName, project, activeRepoIds).then(
      sendChunk('sonarProjects')
    ),
    updateWeeklySonarProjectCount(queryContext, activeRepoIds).then(
      sendChunk('weeklySonarProjectsCount')
    ),
    getReposWithSonarQube(collectionName, project, activeRepoIds).then(
      sendChunk('reposWithSonarQube')
    ),
    updatedWeeklyReposWithSonarQubeCount(queryContext, activeRepoIds).then(
      sendChunk('weeklyReposWithSonarQubeCount')
    ),
    getReposConformingToBranchPolicies(queryContext, activeRepoIds).then(
      sendChunk('branchPolicies')
    ),
    activePipelineIdsPromise.then(length).then(sendChunk('activePipelinesCount')),
    getActivePipelineCentralTemplateBuilds(
      queryContext,
      activeRepoNames,
      activeRepoIds
    ).then(sendChunk('activePipelineCentralTemplateBuilds')),
    getActivePipelineBuilds(queryContext, activeRepoIds).then(
      sendChunk('activePipelineBuilds')
    ),
    activePipelineWithCentralTemplateCountPromise.then(
      sendChunk('activePipelineWithCentralTemplateCount')
    ),
  ]);
};

export const getSummary = async (
  filterArgs: z.infer<typeof filteredReposInputParser>
) => {
  let mergedChunks = {} as Partial<SummaryStats>;

  await getSummaryAsChunks(filterArgs, x => {
    mergedChunks = { ...mergedChunks, ...x };
  });

  return mergedChunks as SummaryStats;
};

export const getNonYamlPipelines = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const { collectionName, project } = fromContext(queryContext);
  const activeRepos = await getActiveRepos(
    queryContext,
    searchTerms,
    groupsIncluded,
    teams
  );

  return RepositoryModel.aggregate<{
    repositoryId: string;
    name: string;
    total: number;
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: activeRepos.map(prop('id')) },
      },
    },
    {
      $lookup: {
        from: 'builddefinitions',
        let: {
          repositoryId: '$id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repositoryId', '$$repositoryId'] },
                  { $eq: ['$process.processType', 1] },
                ],
              },
            },
          },
        ],
        as: 'buildsDefinitions',
      },
    },
    { $match: { $expr: { $gt: [{ $size: '$buildsDefinitions' }, 0] } } },
    {
      $project: {
        _id: 0,
        repositoryId: '$id',
        name: 1,
        total: { $size: '$buildsDefinitions ' },
      },
    },
    { $sort: { total: -1 } },
  ]).exec();
};

export const getYAMLPipelinesForDownload = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const activeRepos = await getActiveRepos(
    queryContext,
    searchTerms,
    groupsIncluded,
    teams
  );

  const repos = await RepositoryModel.aggregate<{
    name: string;
    pipelines: {
      name: string;
      url: string;
      lastRun: Date;
      runCount: number;
      yaml: boolean;
    }[];
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: activeRepos.map(prop('id')) },
      },
    },
    {
      $lookup: {
        from: 'builddefinitions',
        let: {
          repositoryId: '$id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$repositoryId', '$$repositoryId'] },
            },
          },
          {
            $lookup: {
              from: 'builds',
              let: {
                repositoryId: '$repositoryId',
                definitionId: '$id',
              },
              pipeline: [
                {
                  $match: {
                    collectionName,
                    project,
                    $expr: {
                      $and: [
                        { $eq: ['$repository.id', '$$repositoryId'] },
                        { $eq: ['$definition.id', '$$definitionId'] },
                        { $gt: ['$finishTime', startDate] },
                        { $lt: ['$finishTime', endDate] },
                      ],
                    },
                  },
                },
                { $count: 'buildCount' },
                { $project: { buildCount: 1 } },
              ],
              as: 'builds',
            },
          },
          {
            $project: {
              _id: 0,
              name: 1,
              url: 1,
              lastRun: '$latestBuild.startTime',
              runCount: { $first: '$builds.buildCount' },
              yaml: { $eq: ['$process.processType', 2] },
            },
          },
        ],
        as: 'pipelines',
      },
    },
    { $match: { $expr: { $gt: [{ $size: '$pipelines' }, 0] } } },
    {
      $project: {
        _id: 0,
        name: 1,
        // repositoryId: '$id',
        pipelines: 1,
      },
    },
    { $sort: { total: -1 } },
  ]).exec();

  return repos.flatMap(repo =>
    repo.pipelines.map(pipeline => ({
      ...pipeline,
      runCount: pipeline.runCount || 0,
      url: pipelineUrlForUI(pipeline.url),
      repoName: repo.name,
    }))
  );
};

export const getRepoListingWithPipelineCount = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const { collectionName, project } = fromContext(queryContext);
  const activeRepos = await getActiveRepos(
    queryContext,
    searchTerms,
    groupsIncluded,
    teams
  );

  type RepoListingWithPipelineCount = {
    name: string;
    repositoryId: string;
    total: number;
    yaml: number;
    nonYaml: number;
  };

  return RepositoryModel.aggregate<RepoListingWithPipelineCount>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: activeRepos.map(prop('id')) },
      },
    },
    {
      $lookup: {
        from: 'builddefinitions',
        let: { repositoryId: '$id' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [{ $eq: ['$repositoryId', '$$repositoryId'] }],
              },
            },
          },
        ],
        as: 'buildsDefinitions',
      },
    },
    { $match: { $expr: { $gt: [{ $size: '$buildsDefinitions' }, 0] } } },
    {
      $project: {
        _id: 0,
        repositoryId: '$id',
        name: 1,
        total: { $size: '$buildsDefinitions' },
        nonYaml: {
          $size: {
            $filter: {
              input: '$buildsDefinitions',
              as: 'def',
              cond: { $eq: ['$$def.process.processType', 1] },
            },
          },
        },
        yaml: {
          $size: {
            $filter: {
              input: '$buildsDefinitions',
              as: 'def',
              cond: { $eq: ['$$def.process.processType', 2] },
            },
          },
        },
      },
    },
    { $sort: { total: -1 } },
  ]).exec();
};

const getTotalPipelineCountForRepositoryIds = (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  return Promise.all(
    repositoryIds.map(async id => {
      return {
        repositoryId: id,
        count: await pipelineCountForRepo(queryContext, id),
      };
    })
  );
};

const getTotalReleaseBranchesForRepositoryIds = (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  return Promise.all(
    repositoryIds.map(async id => {
      return {
        repositoryId: id,
        branches: await releaseBranchesForRepo(queryContext, id),
      };
    })
  );
};

const sorters = {
  'builds': getReposSortedByBuildCount,
  'branches': getReposSortedByBranchesCount,
  'commits': getReposSortedByCommitsCount,
  'pull-requests': getReposSortedByPullRequestsCount,
  'tests': getReposSortedByTests,
  'code-quality': getReposSortedByCodeQuality,
} as const;

const sortKeys = [
  'builds',
  'branches',
  'commits',
  'pull-requests',
  'tests',
  'code-quality',
] as const;

export type SortKey = (typeof sortKeys)[number];

export const repoFiltersAndSorterInputParser = filteredReposInputParser.extend({
  pageSize: z.number(),
  pageNumber: z.number(),
  sortBy: z.enum(sortKeys).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  cursor: z
    .object({
      pageSize: z.number().optional(),
      pageNumber: z.number().optional(),
    })
    .nullish(),
});

export type RepoFilters = z.infer<typeof repoFiltersAndSorterInputParser>;

export const getFilteredAndSortedReposWithStats = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
  teams,
  sortBy = 'builds',
  sortDirection = 'desc',
  cursor,
}: z.infer<typeof repoFiltersAndSorterInputParser>) => {
  const filteredRepos = await searchAndFilterReposBy({
    queryContext,
    searchTerms,
    groupsIncluded,
    teams,
  });

  const repositoryIds = filteredRepos.map(prop('id'));
  const sortedRepos = await sorters[sortBy](
    queryContext,
    repositoryIds,
    sortDirection,
    cursor?.pageSize || 10,
    cursor?.pageNumber || 0
  );
  const sortedRepoIds = sortedRepos.map(repo => repo.repositoryId);
  const [
    repoDetails,
    builds,
    branches,
    commits,
    tests,
    sonarQualityGateStatuses,
    pullRequests,
    pipelineCounts,
    releaseBranches,
  ] = await Promise.all([
    getDefaultBranchAndNameForRepoIds(queryContext, sortedRepoIds),
    getTotalBuildsForRepositoryIds(queryContext, sortedRepoIds),
    getTotalBranchesForRepositoryIds(queryContext, sortedRepoIds),
    getTotalCommitsForRepositoryIds(queryContext, sortedRepoIds),
    getTotalTestsForRepositoryIds(queryContext, sortedRepoIds),
    getSonarQualityGateStatusForRepoIds(queryContext, sortedRepoIds),
    getTotalPullRequestsForRepositoryIds(queryContext, sortedRepoIds),
    getTotalPipelineCountForRepositoryIds(queryContext, sortedRepoIds),
    getTotalReleaseBranchesForRepositoryIds(queryContext, sortedRepoIds),
  ]);

  const repos = sortedRepos.map(repo => {
    const matchingRepo = propEq('repositoryId', repo.repositoryId);
    return {
      repositoryId: repo.repositoryId,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      repoDetails: repoDetails.find(repoDetail => repoDetail.id === repo.repositoryId)!,
      builds: builds.find(matchingRepo)?.count || 0,
      branches: branches.find(matchingRepo)?.total || 0,
      commits: commits.find(matchingRepo)?.count || 0,
      tests: tests.find(matchingRepo)?.totalTests || 0,
      sonarQualityGateStatuses: sonarQualityGateStatuses.find(matchingRepo),
      pullRequests: pullRequests.find(matchingRepo)?.total || 0,
      pipelineCounts: pipelineCounts.find(matchingRepo)?.count,
      releaseBranches: releaseBranches.find(matchingRepo)?.branches,
    };
  });

  return {
    items: repos,
    nextCursor: {
      pageNumber: (cursor?.pageNumber || 0) + 1,
      pageSize: cursor?.pageSize || 10,
    },
  };
};
