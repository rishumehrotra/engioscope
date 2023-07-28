import type { PipelineStage } from 'mongoose';
import { range } from 'rambda';
import { BuildModel } from './mongoose-models/BuildModel.js';
import type { QueryContext } from './utils.js';
import { fromContext, weekIndexValue } from './utils.js';
import { inDateRange } from './helpers.js';
import { createIntervals } from '../utils.js';

export const getSplitUpBy = (
  field: string,
  condition: unknown,
  startDate: Date
): PipelineStage[] => {
  return [
    {
      $group: {
        _id: weekIndexValue(startDate, field),
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
  async (queryContext: QueryContext, repoIds: string[] | undefined) => {
    const { collectionName, project, startDate, endDate } = fromContext(queryContext);
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
          'startTime': inDateRange(startDate, endDate),
        },
      },
      ...getSplitUpBy('$startTime', condition, startDate),
    ]);

    const { numberOfIntervals } = createIntervals(startDate, endDate);
    return {
      count: result.reduce((acc, item) => acc + item.count, 0),
      byWeek: range(0, numberOfIntervals).map(id => {
        return result.find(obj => obj.weekIndex === id) || { weekIndex: id, count: 0 };
      }),
    };
  };

export const getSuccessfulBuildsBy = getBuildsSplitUp({
  $cond: [{ $eq: ['$result', 'succeeded'] }, 1, 0],
});
export const getTotalBuildsBy = getBuildsSplitUp(1);
