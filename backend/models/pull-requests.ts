import { z } from 'zod';
import { PullRequestModel } from './mongoose-models/PullRequestModel.js';
import { inDateRange } from './helpers.js';
import { queryContextInputParser, fromContext } from './utils.js';

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

  const [activePrs, otherPrs] = await Promise.all([
    PullRequestModel.aggregate<{ total: number }>([
      {
        $match: {
          collectionName,
          project,
          repositoryId,
          status: 'active',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]),

    PullRequestModel.aggregate<PrStats>([
      {
        $match: {
          collectionName,
          project,
          repositoryId,
          status: { $in: ['abandoned', 'completed'] },
          closedDate: inDateRange(startDate, endDate),
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
    ]),
  ]);

  return {
    active: activePrs[0]?.total || 0,
    abandoned: otherPrs.find((pr: PrStats) => pr.prStatus === 'abandoned')?.total || 0,
    completed: otherPrs.find((pr: PrStats) => pr.prStatus === 'completed')?.total || 0,
    minTime: otherPrs.find((pr: PrStats) => pr.prStatus === 'completed')?.minTime || 0,
    maxTime: otherPrs.find((pr: PrStats) => pr.prStatus === 'completed')?.maxTime || 0,
    avgTime: otherPrs.find((pr: PrStats) => pr.prStatus === 'completed')?.avgTime || 0,
  };
};
