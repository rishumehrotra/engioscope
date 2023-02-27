import { z } from 'zod';
import type { PipelineStage } from 'mongoose';
import { oneWeekInMs } from '../../shared/utils.js';
import { collectionAndProjectInputs, inDateRange } from './helpers.js';
import { BuildModel } from './mongoose-models/BuildModel.js';

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

export const getBuildsCountByConditions =
  (duration: 'week' | 'month') =>
  async (
    collectionName: string,
    project: string,
    startDate: Date,
    endDate: Date,
    repoIds: string[] | undefined
  ) => {
    const groupField =
      duration === 'week'
        ? { week: { $week: '$startTime' }, year: { $year: '$startTime' } }
        : { month: { $month: '$startTime' }, year: { $year: '$startTime' } };

    const projectWeekFields = {
      _id: 0,
      year: '$_id.year',
      totalBuilds: 1,
      totalSuccessfulBuilds: 1,
      week: '$_id.week',
      startWeek: 1,
      endWeek: 1,
    };

    const projectMonthFields = {
      _id: 0,
      year: '$_id.year',
      totalBuilds: 1,
      totalSuccessfulBuilds: 1,
      month: '$_id.month',
      startMonth: 1,
      endMonth: 1,
    };

    const result = await BuildModel.aggregate<{
      week?: number;
      month?: number;
      year: number;
      totalBuilds: number;
      totalSuccessfulBuilds: number;
    }>([
      {
        $match: {
          collectionName,
          project,
          'repository.id': { $in: repoIds },
          'startTime': inDateRange(startDate, endDate),
        },
      },
      {
        $group: {
          _id: groupField,
          totalBuilds: { $sum: 1 },
          totalSuccessfulBuilds: {
            $sum: { $cond: [{ $eq: ['$result', 'succeeded'] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          startMonth: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1,
            },
          },
          endMonth: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 0,
            },
          },
          startWeek: {
            $dateFromParts: {
              isoWeekYear: '$_id.year',
              isoWeek: '$_id.week',
              isoDayOfWeek: 1,
            },
          },
          endWeek: {
            $dateFromParts: {
              isoWeekYear: '$_id.year',
              isoWeek: '$_id.week',
              isoDayOfWeek: 7,
            },
          },
        },
      },
      { $project: duration === 'week' ? projectWeekFields : projectMonthFields },
      {
        $sort: {
          '_id.year': 1,
          'startWeek': 1,
        },
      },
    ]);
    return result;
  };

export const getBuildsCountByWeek = getBuildsCountByConditions('week');
export const getBuildsCountByMonth = getBuildsCountByConditions('month');

export const buildPipelineFilterInputParser = z.object(buildPipelineFilterInput);

export const getSplitUpBy = (
  duration: 'week' | 'month',
  field: string,
  condition: unknown
): PipelineStage[] => {
  const groupByMonth = {
    month: { $month: field },
    year: { $year: field },
  };

  const groupBySevenDayInterval = {
    $dateToString: {
      format: '%Y-%m-%d',
      date: {
        $subtract: [
          field,
          {
            $mod: [
              {
                $subtract: [field, new Date('Thu, 01 Jan 1970 00:00:00 GMT')],
              },
              oneWeekInMs,
            ],
          },
        ],
      },
    },
  };

  const projectMonth = {
    $dateToString: {
      format: '%Y-%m-%d',
      date: {
        $dateFromParts: {
          year: '$_id.year',
          month: '$_id.month',
        },
      },
    },
  };

  return [
    {
      $group: {
        _id: duration === 'week' ? groupBySevenDayInterval : groupByMonth,
        counts: { $sum: condition },
      },
    },
    {
      $project: {
        _id: duration === 'month' ? projectMonth : 1,
        counts: 1,
      },
    },
    { $sort: { _id: 1 } },
  ];
};

export const getBuildsSplitUp =
  (condition: unknown) =>
  (duration: 'week' | 'month') =>
  async (
    collectionName: string,
    project: string,
    startDate: Date,
    endDate: Date,
    repoIds: string[] | undefined
  ) => {
    const result = await BuildModel.aggregate<{ _id: string; counts: number }>([
      {
        $match: {
          collectionName,
          project,
          'repository.id': { $in: repoIds },
          'startTime': {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      ...getSplitUpBy(duration, '$startTime', condition),
    ]);
    return result;
  };

export const getSuccessfulBuildsBy = getBuildsSplitUp({
  $cond: [{ $eq: ['$result', 'succeeded'] }, 1, 0],
});

export const getTotalBuildsBy = getBuildsSplitUp(1);
