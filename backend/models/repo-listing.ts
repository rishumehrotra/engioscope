import { z } from 'zod';
import { last, prop, propEq } from 'rambda';
import { configForProject } from '../config.js';
import { BuildModel } from './mongoose-models/BuildModel.js';
import { inDateRange } from './helpers.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import {
  getHealthyBranchesSummary,
  getTotalBranchesForRepositoryIds,
} from './branches.js';
import { getSuccessfulBuildsBy, getTotalBuildsBy } from './build-listing.js';
import {
  getTotalCentralTemplateUsage,
  getCentralTemplateBuildDefs,
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
import { CommitModel } from './mongoose-models/CommitModel.js';
import { unique } from '../utils.js';
import {
  getCoveragesByWeek,
  getDefinitionsWithTestsAndCoverages,
  getReposSortedByTests,
  getTestsByWeek,
  getTotalTestsForRepositoryIds,
} from './testruns.js';
import { getTotalBuildsForRepositoryIds } from './builds.js';
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
import { fromContext, queryContextInputParser } from './utils.js';
import { getTotalPullRequestsForRepositoryIds } from './pull-requests.js';
import { pipelineCountForRepo } from './releases.js';

const getGroupRepositoryNames = (
  collectionName: string,
  project: string,
  filterGroups: string[]
) => {
  const groups = configForProject(collectionName, project)?.groupRepos?.groups;
  if (!groups) return [];

  return filterGroups.flatMap(group => groups[group] || []);
};

export const getActiveRepos = async (
  queryContext: QueryContext,
  searchTerm: string | undefined,
  groupsIncluded: string[] | undefined
) => {
  const isExactRepoSearch = !!(searchTerm?.startsWith('"') && searchTerm?.endsWith('"'));
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const groupRepositoryNames = groupsIncluded
    ? getGroupRepositoryNames(collectionName, project, groupsIncluded)
    : [];

  const repos = await RepositoryModel.find(
    {
      collectionName,
      'project.name': project,
      ...(groupRepositoryNames.length ? { name: { $in: groupRepositoryNames } } : {}),
      ...(searchTerm && isExactRepoSearch
        ? { name: searchTerm.replaceAll('"', '') }
        : searchTerm && !isExactRepoSearch
        ? { name: { $regex: new RegExp(searchTerm, 'i') } }
        : {}),
    },
    { id: 1, name: 1 }
  ).lean();

  const [repoIdsFromBuilds, repoIdsFromCommits] = await Promise.all([
    BuildModel.aggregate<{ id: string }>([
      {
        $match: {
          collectionName,
          project,
          'repository.id': { $in: repos.map(r => r.id) },
          'finishTime': inDateRange(startDate, endDate),
        },
      },
      {
        $group: {
          _id: '$repository.id',
          name: { $first: '$repository.name' },
          buildsCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
        },
      },
    ]),
    CommitModel.distinct('repositoryId', {
      collectionName,
      project,
      'author.date': inDateRange(startDate, endDate),
      'repositoryId': { $in: repos.map(r => r.id) },
    }),
  ]);

  const activeRepoIds = unique([
    ...repoIdsFromBuilds.map(r => r.id),
    ...(repoIdsFromCommits as string[]),
  ]);

  return repos
    .filter(r => activeRepoIds.includes(r.id))
    .map(r => ({ id: r.id, name: r.name }));
};

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

  const result = await BuildDefinitionModel.aggregate<{ matchingCount: number }>([
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
      $count: 'matchingCount',
    },
  ]);

  return {
    total: centralTemplateBuildDefs.reduce(
      (total, build) => total + build.centralTemplateBuilds,
      0
    ),
    central: result[0]?.matchingCount || 0,
  };
};

export const FilteredReposInputParser = z.object({
  queryContext: queryContextInputParser,
  searchTerm: z.union([z.string(), z.undefined()]),
  groupsIncluded: z.union([z.array(z.string()), z.undefined()]),
});

export const getFilteredRepos = async ({
  queryContext,
  searchTerm,
  groupsIncluded,
}: z.infer<typeof FilteredReposInputParser>) => {
  const isExactRepoSearch = !!(searchTerm?.startsWith('"') && searchTerm?.endsWith('"'));

  const { collectionName, project } = fromContext(queryContext);

  const groupRepositoryNames = groupsIncluded
    ? getGroupRepositoryNames(collectionName, project, groupsIncluded)
    : [];

  return RepositoryModel.find(
    {
      collectionName,
      'project.name': project,
      ...(groupRepositoryNames.length ? { name: { $in: groupRepositoryNames } } : {}),
      ...(searchTerm && isExactRepoSearch
        ? { name: searchTerm.replaceAll('"', '') }
        : searchTerm && !isExactRepoSearch
        ? { name: { $regex: new RegExp(searchTerm, 'i') } }
        : {}),
    },
    { id: 1, name: 1 }
  ).lean();
};
export const getFilteredReposCount = async ({
  queryContext,
  searchTerm,
  groupsIncluded,
}: z.infer<typeof FilteredReposInputParser>) => {
  return (
    await getFilteredRepos({
      queryContext,
      searchTerm,
      groupsIncluded,
    })
  ).length;
};

export const getSummaryInputParser = z.object({
  queryContext: queryContextInputParser,
  searchTerm: z.union([z.string(), z.undefined()]),
  groupsIncluded: z.union([z.array(z.string()), z.undefined()]),
});

export const getSummary = async ({
  queryContext,
  searchTerm,
  groupsIncluded,
}: z.infer<typeof getSummaryInputParser>) => {
  const { collectionName, project } = fromContext(queryContext);

  const activeRepos = await getActiveRepos(queryContext, searchTerm, groupsIncluded);

  const activeRepoIds = activeRepos.map(prop('id'));
  const activeRepoNames = activeRepos.map(prop('name'));

  const defaultBranchIDs = await getAllRepoDefaultBranchIDs(
    collectionName,
    project,
    activeRepoIds
  );

  const [
    successfulBuilds,
    totalBuilds,
    centralTemplateUsage,
    pipelines,
    healthyBranches,
    hasReleasesReposCount,
    centralTemplatePipeline,
    defSummary,
    weeklyTestsSummary,
    weeklyCoverageSummary,
    totalRepos,
    sonarProjects,
    weeklySonarProjectsCount,
    reposWithSonarQube,
    weeklyReposWithSonarQubeCount,
    branchPolicies,
  ] = await Promise.all([
    getSuccessfulBuildsBy(queryContext, activeRepoIds),
    getTotalBuildsBy(queryContext, activeRepoIds),
    getTotalCentralTemplateUsage(queryContext, activeRepoNames),
    getYamlPipelinesCountSummary(queryContext, activeRepoIds),
    getHealthyBranchesSummary(queryContext, activeRepoIds, defaultBranchIDs),
    getHasReleasesSummary(queryContext, activeRepoIds),
    getCentralTemplatePipeline(queryContext, activeRepoIds),
    getDefinitionsWithTestsAndCoverages(queryContext, activeRepoIds),
    getTestsByWeek(queryContext, activeRepoIds),
    getCoveragesByWeek(queryContext, activeRepoIds),
    getFilteredRepos({ queryContext, searchTerm, groupsIncluded }),
    getSonarProjectsCount(collectionName, project, activeRepoIds),
    updateWeeklySonarProjectCount(queryContext, activeRepoIds),
    getReposWithSonarQube(collectionName, project, activeRepoIds),
    updatedWeeklyReposWithSonarQubeCount(queryContext, activeRepoIds),
    getReposConformingToBranchPolicies(queryContext, activeRepoIds),
  ]);

  return {
    centralTemplateUsage,
    pipelines,
    healthyBranches,
    totalBuilds,
    successfulBuilds,
    totalActiveRepos: activeRepoIds.length,
    totalRepos: totalRepos.length,
    hasReleasesReposCount,
    centralTemplatePipeline,
    totalDefs: defSummary.totalDefs,
    defsWithTests: defSummary.defsWithTests,
    defsWithCoverage: defSummary.defsWithCoverage,
    weeklyTestsSummary,
    weeklyCoverageSummary,
    latestTestsSummary: last(weeklyTestsSummary),
    latestCoverageSummary: last(weeklyCoverageSummary),
    sonarProjects,
    weeklySonarProjectsCount,
    reposWithSonarQube,
    weeklyReposWithSonarQubeCount,
    branchPolicies,
  };
};

export const NonYamlPipelinesParser = z.object({
  queryContext: queryContextInputParser,
  searchTerm: z.union([z.string(), z.undefined()]),
  groupsIncluded: z.union([z.array(z.string()), z.undefined()]),
});

export const getNonYamlPipelines = async ({
  queryContext,
  searchTerm,
  groupsIncluded,
}: z.infer<typeof NonYamlPipelinesParser>) => {
  const { collectionName, project } = fromContext(queryContext);
  const activeRepos = await getActiveRepos(queryContext, searchTerm, groupsIncluded);

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
        total: { $size: '$buildsDefinitions' },
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

export const repoFiltersAndSorterInputParser = z.object({
  queryContext: queryContextInputParser,
  searchTerm: z.string().optional(),
  groupsIncluded: z.array(z.string()).optional(),
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
  searchTerm,
  groupsIncluded,
  sortBy = 'builds',
  sortDirection = 'desc',
  cursor,
}: z.infer<typeof repoFiltersAndSorterInputParser>) => {
  const filteredRepos = await getFilteredRepos({
    queryContext,
    searchTerm,
    groupsIncluded,
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
