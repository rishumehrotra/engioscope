import { z } from 'zod';

import { collectionAndProjectInputs } from './helpers.js';
import { BuildModel } from './builds.js';

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

export type BuildSearchArgs = {
  collectionName: string;
  project: string;
  searchTerm: string;
  startDate: Date;
  endDate: Date;
};

// Search Builds by Repository Name and Date Range
export const searchBuilds = async (buildSearchArgs: BuildSearchArgs) => {
  const result = await BuildModel.aggregate([
    {
      $match: {
        'collectionName': buildSearchArgs.collectionName,
        'project': buildSearchArgs.project,
        'repository.name': new RegExp(buildSearchArgs.searchTerm, 'i'),
        'createdAt': { $gte: buildSearchArgs.startDate, $lt: buildSearchArgs.endDate },
      },
    },
  ]);
  return result;
};

// Search Builds by Repository Name and Date Range
// and Find Total Successful Builds Count
export const getSuccessfulBuildsCount = async (buildSearchArgs: BuildSearchArgs) => {
  const result = await BuildModel.aggregate<{ count: number }>([
    {
      $match: {
        'collectionName': buildSearchArgs.collectionName,
        'project': buildSearchArgs.project,
        'repository.name': new RegExp(buildSearchArgs.searchTerm, 'i'),
        'createdAt': { $gte: buildSearchArgs.startDate, $lt: buildSearchArgs.endDate },
        'result': 'succeeded',
      },
    },
    {
      $count: 'successfulBuildsCount',
    },
  ]);
  return result[0]?.count || 0;
};

// Search Builds by Repository Name and Date Range
// and Find Total Builds Count
export const getTotalBuildsCount = async (buildSearchArgs: BuildSearchArgs) => {
  const result = await BuildModel.aggregate<{ count: number }>([
    {
      $match: {
        'collectionName': buildSearchArgs.collectionName,
        'project': buildSearchArgs.project,
        'repository.name': new RegExp(buildSearchArgs.searchTerm, 'i'),
        'createdAt': { $gte: buildSearchArgs.startDate, $lt: buildSearchArgs.endDate },
      },
    },
    {
      $count: 'totalBuildsCount',
    },
  ]);
  return result[0]?.count || 0;
};
// Search Builds by Repository Name and Date Range
// and Find Total Builds Count For Each Week During The Date Range Specified
export const getTotalBuildsCountByWeek = async (buildSearchArgs: BuildSearchArgs) => {
  const result = await BuildModel.aggregate<{
    week: number;
    year: number;
    totalBuilds: number;
  }>([
    {
      $match: {
        'collectionName': buildSearchArgs.collectionName,
        'project': buildSearchArgs.project,
        'repository.name': new RegExp(buildSearchArgs.searchTerm, 'i'),
        'createdAt': { $gte: buildSearchArgs.startDate, $lt: buildSearchArgs.endDate },
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

// Search Builds by Repository Name and Date Range
// and Find Total Builds Count For Each Month During The Date Range Specified
export const getTotalBuildsCountByMonth = async (buildSearchArgs: BuildSearchArgs) => {
  const result = await BuildModel.aggregate<{
    month: number;
    year: number;
    totalBuilds: number;
  }>([
    {
      $match: {
        'collectionName': buildSearchArgs.collectionName,
        'project': buildSearchArgs.project,
        'repository.name': new RegExp(buildSearchArgs.searchTerm, 'i'),
        'createdAt': { $gte: buildSearchArgs.startDate, $lt: buildSearchArgs.endDate },
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

export const buildPipelineFilterInputParser = z.object(buildPipelineFilterInput);
