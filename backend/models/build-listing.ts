import { range } from 'rambda';
import { oneDayInMs, oneWeekInMs } from '../../shared/utils.js';
import { BuildModel } from './mongoose-models/BuildModel.js';

export const getWeeklyBuildsStatsFor =
  (statsFor: 'total' | 'successful') =>
  async (
    collectionName: string,
    project: string,
    startDate: Date,
    endDate: Date,
    repoIds: string[] | undefined
  ) => {
    const result = await BuildModel.aggregate<{
      id: number;
      counts: number;
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
      {
        $group: {
          _id: {
            $trunc: {
              $divide: [{ $subtract: ['$finishTime', new Date(startDate)] }, oneWeekInMs],
            },
          },
          counts: {
            $sum:
              statsFor === 'successful'
                ? { $cond: [{ $eq: ['$result', 'succeeded'] }, 1, 0] }
                : 1,
          },
          // For Debugging Remove Once In Production
          start: { $min: '$finishTime' },
          end: { $max: '$finishTime' },
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          counts: 1,
          // For Debugging Remove Once In Production
          start: 1,
          end: 1,
        },
      },
      { $sort: { id: 1 } },
    ]);

    const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
    const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

    return {
      count: result.reduce((acc, item) => acc + item.counts, 0),
      byWeek: range(0, totalIntervals)
        .map(id => {
          return result.find(obj => obj.id === id) || { id, counts: 0 };
        })
        .slice(totalIntervals - Math.floor(totalDays / 7)),
    };
  };

export const getWeeklyTotalBuilds = getWeeklyBuildsStatsFor('total');
export const getWeeklySuccessfulBuilds = getWeeklyBuildsStatsFor('successful');
