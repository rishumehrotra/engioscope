import type { PipelineStage } from 'mongoose';
import { range } from 'rambda';
import { oneDayInMs, oneWeekInMs } from '../../shared/utils.js';
import { BuildModel } from './mongoose-models/BuildModel.js';

export const getSplitUpBy = (
  field: string,
  condition: unknown,
  startDate: Date
): PipelineStage[] => {
  return [
    {
      $group: {
        _id: {
          $trunc: {
            $divide: [
              {
                $subtract: [field, new Date(startDate)],
              },
              oneWeekInMs,
            ],
          },
        },
        count: { $sum: condition },
        // For Debugging Remove Once In Production
        start: { $min: field },
        end: { $max: field },
      },
    },
    {
      $project: {
        _id: 0,
        weekIndex: '$_id',
        count: 1,
        // For Debugging Remove Once In Production
        start: 1,
        end: 1,
      },
    },
    { $sort: { id: 1 } },
  ];
};

export const getBuildsSplitUp =
  (condition: unknown) =>
  async (
    collectionName: string,
    project: string,
    startDate: Date,
    endDate: Date,
    repoIds: string[] | undefined
  ) => {
    const result = await BuildModel.aggregate<{
      weekIndex: number;
      count: number;
      start: Date;
      end: Date;
    }>([
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
      ...getSplitUpBy('$startTime', condition, startDate),
    ]);

    const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
    const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

    return {
      count: result.reduce((acc, item) => acc + item.count, 0),
      byWeek: range(0, totalIntervals)
        .map(id => {
          return result.find(obj => obj.weekIndex === id) || { weekIndex: id, count: 0 };
        })
        .slice(totalIntervals - Math.floor(totalDays / 7)),
    };
  };

export const getSuccessfulBuildsBy = getBuildsSplitUp({
  $cond: [{ $eq: ['$result', 'succeeded'] }, 1, 0],
});
export const getTotalBuildsBy = getBuildsSplitUp(1);
