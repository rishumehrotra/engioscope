import { z } from 'zod';
import { multiply, prop } from 'rambda';
import { configForProject } from '../config.js';
import { BuildModel } from './mongoose-models/BuildModel.js';
import { collectionAndProjectInputs, dateRangeInputs, inDateRange } from './helpers.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import { getHealthyBranchesSummary } from './branches.js';
import { getSuccessfulBuildsBy, getTotalBuildsBy } from './build-listing.js';
import {
  getTotalCentralTemplateUsage,
  getCentralTemplateBuildDefs,
} from './build-reports.js';
import { getAllRepoDefaultBranchIDs } from './repos.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { getHasReleasesSummary } from './release-listing.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';

const getGroupRepositoryNames = (
  collectionName: string,
  project: string,
  filterGroups: string[]
) => {
  const groups = configForProject(collectionName, project)?.groupRepos?.groups;
  if (!groups) return [];

  return filterGroups.flatMap(group => groups[group] || []);
};

const getRepoIdFromNames = async (
  collectionName: string,
  project: string,
  repoNames: string[]
) => {
  const result = await RepositoryModel.find(
    {
      collectionName,
      'project.name': project,
      'name': { $in: repoNames },
    },
    { id: 1 }
  ).lean();

  return result.map(repo => repo.id);
};

export const getActiveRepoIds = async (
  collectionName: string,
  project: string,
  startDate: Date,
  endDate: Date,
  searchTerm: string | undefined,
  groupsIncluded: string[] | undefined
) => {
  const groupRepositoryNames = groupsIncluded
    ? getGroupRepositoryNames(collectionName, project, groupsIncluded)
    : [];

  const groupRepositoryIDs = groupsIncluded
    ? await getRepoIdFromNames(collectionName, project, groupRepositoryNames)
    : [];

  const result = await BuildModel.aggregate<{
    id: string;
    buildsCount: number;
    name: string;
  }>([
    {
      $match: {
        collectionName,
        project,
        ...(groupRepositoryIDs.length === 0
          ? {}
          : { 'repository.id': { $in: groupRepositoryIDs } }),
        ...(searchTerm
          ? { 'repository.name': { $regex: new RegExp(searchTerm, 'i') } }
          : {}),
        startTime: inDateRange(startDate, endDate),
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
        buildsCount: 1,
        name: 1,
      },
    },
  ]);

  return result;
};

export const getYamlPipelinesCountSummary = async (
  collectionName: string,
  project: string,
  repoIds?: string[]
) => {
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
  collectionName: string,
  project: string,
  repoIds: string[]
) => {
  const centralTemplateBuildDefs = await getCentralTemplateBuildDefs(
    collectionName,
    project
  );

  const buildDefinitionId = centralTemplateBuildDefs?.map(
    buildDef => buildDef.buildDefinitionId
  );

  const result = await BuildDefinitionModel.aggregate([
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
          collectionName: '$collectionName',
          project: '$project',
          repositoryId: '$repositoryId',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project.name', '$$project'] },
                  { $eq: ['$id', '$$repositoryId'] },
                ],
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
          collectionName: '$collectionName',
          project: '$project',
          repositoryId: '$repositoryId',
          buildDefinitionId: '$buildDefinitionId',
          defaultBranch: '$defaultBranch',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project', '$$project'] },
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

export const getSummaryInputParser = z.object({
  ...collectionAndProjectInputs,
  ...dateRangeInputs,
  searchTerm: z.union([z.string(), z.undefined()]),
  groupsIncluded: z.union([z.array(z.string()), z.undefined()]),
});

export const getSummary = async ({
  collectionName,
  project,
  startDate,
  endDate,
  searchTerm,
  groupsIncluded,
}: z.infer<typeof getSummaryInputParser>) => {
  const activeRepos = await getActiveRepoIds(
    collectionName,
    project,
    startDate,
    endDate,
    searchTerm,
    groupsIncluded
  );

  const repoIds = activeRepos.map(prop('id'));
  const repoNames = activeRepos.map(prop('name'));

  const defaultBranchIDs = await getAllRepoDefaultBranchIDs(
    collectionName,
    project,
    repoIds
  );

  const [
    successfulBuildsCount,
    totalBuildsCount,
    totalCentralTemplate,
    yamlPipelines,
    healthyBranches,
    hasReleasesReposCount,
    centralTemplatePipeline,
  ] = await Promise.all([
    getSuccessfulBuildsBy('week')(collectionName, project, startDate, endDate, repoIds),
    getTotalBuildsBy('week')(collectionName, project, startDate, endDate, repoIds),

    getTotalCentralTemplateUsage(collectionName, project, repoNames),

    getYamlPipelinesCountSummary(collectionName, project, repoIds),

    getHealthyBranchesSummary({
      collectionName,
      project,
      repoIds,
      defaultBranchIDs,
    }),

    getHasReleasesSummary(collectionName, project, startDate, endDate, repoIds),

    getCentralTemplatePipeline(collectionName, project, repoIds),
  ]);

  const totalBuilds = totalBuildsCount.reduce((acc, week) => acc + week.counts, 0);
  const totalSuccessfulBuilds = successfulBuildsCount.reduce(
    (acc, week) => acc + week.counts,
    0
  );

  const successRate = divide(totalSuccessfulBuilds, totalBuilds)
    .map(toPercentage)
    .getOr('-');

  const weeklySuccess = totalBuildsCount.map(totalObj => {
    const successObj = successfulBuildsCount.find(s => s._id === totalObj._id);

    if (successObj) {
      const rate = divide(successObj.counts, totalObj.counts).map(multiply(100)).getOr(0);
      return rate;
    }
    return 0;
  });

  return {
    totalBuildsCount,
    successfulBuildsCount,
    totalCentralTemplate,
    yamlPipelines,
    healthyBranches,
    weeklySuccess,
    successRate,
    totalBuilds,
    totalSuccessfulBuilds,
    totalActiveRepos: repoIds.length,
    hasReleasesReposCount,
    centralTemplatePipeline,
  };
};

export const NonYamlPipelinesParser = z.object({
  ...collectionAndProjectInputs,
  ...dateRangeInputs,
  searchTerm: z.union([z.string(), z.undefined()]),
  groupsIncluded: z.union([z.array(z.string()), z.undefined()]),
});

export const getNonYamlPipelines = async ({
  collectionName,
  project,
  startDate,
  endDate,
  searchTerm,
  groupsIncluded,
}: z.infer<typeof NonYamlPipelinesParser>) => {
  const activeRepos = await getActiveRepoIds(
    collectionName,
    project,
    startDate,
    endDate,
    searchTerm,
    groupsIncluded
  );

  const repoIds = activeRepos.map((repo: { id: string }) => repo.id);
  const result = await RepositoryModel.aggregate<{
    repositoryId: string;
    name: string;
    total: number;
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: repoIds },
      },
    },
    {
      $lookup: {
        from: 'builddefinitions',
        let: {
          collectionName: '$collectionName',
          project: '$project.name',
          repositoryId: '$id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project', '$$project'] },
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
  ]);

  return result;
};
