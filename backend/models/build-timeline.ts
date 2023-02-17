import { or } from 'rambda';
import { z } from 'zod';
import { oneSecondInMs } from '../../shared/utils.js';
import { getConfig } from '../config.js';
import { BuildTimelineModel } from './mongoose-models/BuildTimelineModel.js';
import { collectionAndProjectInputs } from './helpers.js';

const resultCount = 7;

const formatName = {
  $arrayElemAt: [
    {
      $split: [
        {
          $arrayElemAt: [{ $split: ['$records.name', '@'] }, 0],
        },
        '/',
      ],
    },
    0,
  ],
};

const getSlowestTasks = async (
  collectionName: string,
  project: string,
  buildDefinitionId: number,
  queryFrom = getConfig().azure.queryFrom
) => {
  type Result = {
    _id: string;
    averageTime: number;
  };

  const results: Result[] = await BuildTimelineModel.aggregate([
    {
      $match: {
        collectionName,
        project,
        buildDefinitionId,
        'records.startTime': { $gt: queryFrom },
      },
    },
    { $unwind: '$records' },
    { $match: { 'records.type': 'Task' } },
    {
      $group: {
        _id: formatName,
        averageTime: {
          $avg: {
            $dateDiff: {
              startDate: '$records.startTime',
              endDate: '$records.finishTime',
              unit: 'millisecond',
            },
          },
        },
      },
    },
    { $sort: { averageTime: -1 } },
    { $match: { averageTime: { $gt: oneSecondInMs * 30 } } },
    { $limit: resultCount },
  ]);

  return results.map(r => ({ name: r._id, time: r.averageTime }));
};

const getFailing = async (
  collectionName: string,
  project: string,
  buildDefinitionId: number,
  queryFrom = getConfig().azure.queryFrom
) => {
  type Result = {
    _id: string;
    errorCount: number;
    continueOnError: boolean[];
  };

  const results: Result[] = await BuildTimelineModel.aggregate([
    {
      $match: {
        collectionName,
        project,
        buildDefinitionId,
        'records.startTime': { $gt: queryFrom },
      },
    },
    { $unwind: '$records' },
    { $match: { 'records.type': 'Task' } },
    {
      $group: {
        _id: formatName,
        errorCount: {
          $avg: {
            $cond: {
              if: { $gte: ['$records.errorCount', 1] },
              then: 1,
              else: 0,
            },
          },
        },
        continueOnError: {
          $addToSet: {
            $cond: {
              if: {
                $and: [
                  { $gte: ['$records.errorCount', 1] },
                  { $eq: ['$records.result', 'succeeded'] },
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    },
    { $sort: { errorCount: -1 } },
    { $match: { errorCount: { $gt: 0.05 } } },
    { $limit: resultCount },
  ]);

  return results.map(r => ({
    name: r._id,
    errorCount: r.errorCount,
    continueOnError: r.continueOnError.flat().reduce(or, false),
  }));
};

const getSkipped = async (
  collectionName: string,
  project: string,
  buildDefinitionId: number,
  queryFrom = getConfig().azure.queryFrom
) => {
  type Result = {
    _id: string;
    skippedPercentage: number;
    type: string[];
  };

  const results: Result[] = await BuildTimelineModel.aggregate([
    {
      $match: {
        collectionName,
        project,
        buildDefinitionId,
        'records.startTime': { $gt: queryFrom },
      },
    },
    { $unwind: '$records' },
    {
      $group: {
        _id: formatName,
        type: { $addToSet: '$records.type' },
        skippedPercentage: {
          $avg: {
            $cond: { if: { $eq: ['$records.result', 'skipped'] }, then: 1, else: 0 },
          },
        },
      },
    },
    { $sort: { skippedPercentage: -1 } },
    { $match: { skippedPercentage: { $gt: 0.01 } } },
    { $limit: resultCount },
  ]);

  return results.map(r => ({
    name: r._id,
    skippedPercentage: r.skippedPercentage,
    type: r.type[0],
  }));
};

export const aggregateBuildTimelineStatsInputParser = z.object({
  ...collectionAndProjectInputs,
  buildDefinitionId: z.number(),
  queryFrom: z.date().optional(),
});

export const aggregateBuildTimelineStats = async ({
  collectionName,
  project,
  buildDefinitionId,
  queryFrom = getConfig().azure.queryFrom,
}: z.infer<typeof aggregateBuildTimelineStatsInputParser>) => {
  const [count, slowest, failing, skipped] = await Promise.all([
    BuildTimelineModel.find({
      collectionName,
      project,
      buildDefinitionId,
      queryFrom: { $gt: queryFrom },
    }).count(),
    getSlowestTasks(collectionName, project, buildDefinitionId, queryFrom),
    getFailing(collectionName, project, buildDefinitionId, queryFrom),
    getSkipped(collectionName, project, buildDefinitionId, queryFrom),
  ]);

  return {
    count,
    slowest,
    failing,
    skipped,
  };
};
