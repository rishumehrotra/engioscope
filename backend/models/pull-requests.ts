import { z } from 'zod';
import { PullRequestModel } from './mongoose-models/PullRequestModel.js';
import { inDateRange } from './helpers.js';
import type { QueryContext } from './utils.js';
import { queryContextInputParser, fromContext, weekIndexValue } from './utils.js';

export const PullRequestsSummaryForRepoInputParser = z.object({
  queryContext: queryContextInputParser,
  repositoryId: z.string(),
});

export const getPullRequestsSummaryForRepo = async ({
  queryContext,
  repositoryId,
}: z.infer<typeof PullRequestsSummaryForRepoInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  type PrStats = {
    prStatus: string;
    total: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
  };

  const prStats = await PullRequestModel.aggregate<PrStats>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        $or: [
          { status: 'active' },
          {
            status: { $in: ['abandoned', 'completed'] },
            closedDate: inDateRange(startDate, endDate),
          },
        ],
      },
    },
    {
      $addFields: {
        timeCompleted: {
          $cond: {
            if: { $eq: ['$status', 'completed'] },
            then: {
              $dateDiff: {
                startDate: '$creationDate',
                endDate: '$closedDate',
                unit: 'millisecond',
              },
            },
            else: 0,
          },
        },
      },
    },
    {
      $group: {
        _id: '$status',
        total: { $sum: 1 },
        minTime: { $min: '$timeCompleted' },
        maxTime: { $max: '$timeCompleted' },
        avgTime: { $avg: '$timeCompleted' },
      },
    },
    {
      $project: {
        _id: 0,
        prStatus: '$_id',
        total: 1,
        minTime: 1,
        maxTime: 1,
        avgTime: 1,
      },
    },
  ]);

  return {
    active: prStats.find((pr: PrStats) => pr.prStatus === 'active')?.total || 0,
    abandoned: prStats.find((pr: PrStats) => pr.prStatus === 'abandoned')?.total || 0,
    completed: prStats.find((pr: PrStats) => pr.prStatus === 'completed')?.total || 0,
    minTime: prStats.find((pr: PrStats) => pr.prStatus === 'completed')?.minTime || 0,
    maxTime: prStats.find((pr: PrStats) => pr.prStatus === 'completed')?.maxTime || 0,
    avgTime: prStats.find((pr: PrStats) => pr.prStatus === 'completed')?.avgTime || 0,
  };
};

export const getTotalPullRequestsForRepositoryIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return PullRequestModel.aggregate<{
    repositoryId: string;
    total: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
        $or: [
          { status: 'active' },
          {
            status: { $in: ['abandoned', 'completed'] },
            closedDate: inDateRange(startDate, endDate),
          },
        ],
      },
    },
    { $group: { _id: '$repositoryId', total: { $sum: 1 } } },
    {
      $project: {
        _id: 0,
        repositoryId: '$_id',
        total: 1,
      },
    },
  ]).exec();
};

export const getWeeklyPullRequestMerges = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return PullRequestModel.aggregate<{
    weekly: { weekIndex: number; mergeCount: number }[];
    average: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
        closedDate: inDateRange(startDate, endDate),
        status: 'completed',
      },
    },
    { $addFields: { weekIndex: weekIndexValue(startDate, '$closedDate') } },
    {
      $group: {
        _id: '$weekIndex',
        weekIndex: { $first: '$weekIndex' },
        mergeCount: { $sum: 1 },
      },
    },
    { $sort: { weekIndex: 1 } },
    {
      $group: {
        _id: null,
        weekly: { $push: { weekIndex: '$weekIndex', mergeCount: '$mergeCount' } },
        average: { $avg: '$mergeCount' },
      },
    },
    { $project: { _id: 0 } },
  ]).then(result => result[0] || { weekly: [], average: 0 });
};
