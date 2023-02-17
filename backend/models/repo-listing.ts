import { configForProject } from '../config.js';
import { BuildModel } from './builds.js';
import { inDateRange } from './helpers.js';
import { RepositoryModel } from './repos.js';

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

// CENTRAL TEMPLATE USAGE
// totalCentralTemplateUsage

// Yaml Pipelines Count Summary
// getYamlPipelinesCountSummary

// FOR BRANCHES SUMMARY
// getHealthyBranchesSummary

// For Builds SUmmary
// getBuildSummary
// getBuildsCountByWeek
// getBuildsCountByMonth
