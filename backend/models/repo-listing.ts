import { z } from 'zod';
import { configForProject } from '../config.js';
import { BuildModel } from './mongoose-models/BuildModel.js';
import { collectionAndProjectInputs, dateRangeInputs, inDateRange } from './helpers.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import { getHealthyBranchesSummary } from './branches.js';
import {
  getNonYamlPipelines,
  getYamlPipelinesCountSummary,
} from './build-definitions.js';
import { getBuildsCountByWeek } from './build-listing.js';
import { getTotalCentralTemplateUsage } from './build-reports.js';
import { getAllRepoDefaultBranchIDs } from './repos.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { getHasReleasesSummary } from './release-listing.js';

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
          ? {
              'repository.name': { $regex: new RegExp(searchTerm, 'i') },
            }
          : {}),
        startTime: inDateRange(startDate, endDate),
      },
    },
    {
      $group: {
        _id: '$repository.id',
        name: { $first: '$repository.name' },
        buildsCount: {
          $sum: 1,
        },
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

  const repoIds = activeRepos.map((repo: { id: string }) => repo.id);

  const repoNames = activeRepos.map(repo => repo.name);

  const defaultBranchIDs = await getAllRepoDefaultBranchIDs(
    collectionName,
    project,
    repoIds
  );

  const [
    buildsCountByWeek,
    totalCentralTemplate,
    yamlPipelinesCount,
    totalHealthyBranches,
    hasReleasesReposCount,
    nonYamlPipelines,
  ] = await Promise.all([
    getBuildsCountByWeek(
      collectionName,
      project,
      startDate,
      endDate,
      searchTerm,
      repoIds
    ),

    getTotalCentralTemplateUsage(collectionName, project, repoNames),

    getYamlPipelinesCountSummary(
      collectionName,
      project,
      startDate,
      endDate,
      searchTerm,
      repoIds
    ),

    getHealthyBranchesSummary({
      collectionName,
      project,
      repoIds,
      defaultBranchIDs,
    }),

    getHasReleasesSummary(collectionName, project, startDate, endDate, repoIds),

    getNonYamlPipelines(collectionName, project, repoIds),
  ]);

  const totalBuilds = buildsCountByWeek.reduce((acc, week) => acc + week.totalBuilds, 0);
  const totalSuccessfulBuilds = buildsCountByWeek.reduce(
    (acc, week) => acc + week.totalSuccessfulBuilds,
    0
  );

  const successRate = divide(totalSuccessfulBuilds, totalBuilds)
    .map(toPercentage)
    .getOr('-');

  const weeklySuccess = buildsCountByWeek.map(week => {
    return divide(week.totalSuccessfulBuilds, week.totalBuilds).getOr(0) * 100;
  });

  return {
    buildsCountByWeek,
    totalCentralTemplate,
    yamlPipelinesCount,
    totalHealthyBranches,
    weeklySuccess,
    successRate,
    totalBuilds,
    totalSuccessfulBuilds,
    totalActiveRepos: repoIds.length,
    hasReleasesReposCount,
    nonYamlPipelines,
  };
};
