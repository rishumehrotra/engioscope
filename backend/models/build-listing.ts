import { z } from 'zod';

import { collectionAndProjectInputs } from './helpers.js';
import { BuildModel } from './builds.js';
import { searchRepositories } from './repos.js';

// TODO: Filter Options Logic
export const buildFilterOptions = {
  hasBuilds: z.boolean(),
  hasFailedBuilds: z.boolean(),
  hasCommits: z.boolean(),
  hasTechDebt: z.number(),
};

// TODO: Filter Logic
export const buildSortOptions = {
  totalBuilds: z.number(),
  totalCommits: z.number(),
  totalBranches: z.number(),
  totalTests: z.number(),
  totalPullRequests: z.number(),
  codeQuality: z.number(),
};

export const buildPipelineFilterInput = {
  ...collectionAndProjectInputs,
  repo: z.string(),
  buildDefinitionId: z.string(),
};

export type SearchBuildData = {
  totalBuilds: number;
  totalSuccessfulBuilds: number;
  builds: {
    id: string;
    definitionId: string;
    result: string;
    startTime: Date;
    url: string;
  }[];
};

export const getTotalBuildsCountByWeek = async (
  collectionName: string,
  project: string,
  searchTerm: string,
  startDate: Date,
  endDate: Date
) => {
  const result = await BuildModel.aggregate<{
    week: number;
    year: number;
    totalBuilds: number;
  }>([
    {
      $match: {
        'collectionName': collectionName,
        'project': project,
        'repository.name': new RegExp(searchTerm, 'i'),
        'startTime': { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          week: { $week: '$startTime' },
          year: { $year: '$startTime' },
        },
        totalBuilds: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        week: '$_id.week',
        year: '$_id.year',
        totalBuilds: 1,
      },
    },
    {
      $sort: { '_id.year': 1, '_id.week': 1 },
    },
  ]);
  return result;
};

export const getTotalBuildsCountByMonth = async (
  collectionName: string,
  project: string,
  searchTerm: string,
  startDate: Date,
  endDate: Date
) => {
  const result = await BuildModel.aggregate<{
    month: number;
    year: number;
    totalBuilds: number;
  }>([
    {
      $match: {
        'collectionName': collectionName,
        'project': project,
        'repository.name': new RegExp(searchTerm, 'i'),
        'startTime': { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$startTime' },
          year: { $year: '$startTime' },
        },
        totalBuilds: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        month: '$_id.month',
        year: '$_id.year',
        totalBuilds: 1,
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);
  return result;
};

export const getBuildSummary = async (
  collectionName: string,
  project: string,
  startDate: Date,
  endDate: Date,
  searchTerm?: string
) => {
  const allRepos = await searchRepositories(collectionName, project, searchTerm);

  const totals = await BuildModel.aggregate<{
    totalBuilds: number;
    totalSuccesses: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        'startTime': { $gte: startDate, $lt: endDate },
        'repository.id': { $in: allRepos.map(r => r.id) },
      },
    },
    {
      $group: {
        _id: null,
        totalBuilds: { $sum: 1 },
        totalSuccesses: {
          $sum: {
            $cond: {
              if: { $eq: ['$result', 'succeeded'] },
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
        totalBuilds: 1,
        totalSuccesses: 1,
      },
    },
  ]);

  return totals[0] || { totalBuilds: 0, totalSuccesses: 0 };
};

export const buildPipelineFilterInputParser = z.object(buildPipelineFilterInput);
