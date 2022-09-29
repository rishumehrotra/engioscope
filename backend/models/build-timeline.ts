import mongoose from 'mongoose';
import { or } from 'rambda';
import { oneSecondInMs } from '../../shared/utils.js';
import { getConfig } from '../config.js';
import type { Timeline } from '../scraper/types-azure.js';

const { Schema, model } = mongoose;

export type BuildTimelineRecord = {
  name: string;
  order: number;
  type: 'Task' | 'Job' | 'Checkpoint' | 'Phase' | 'Stage' | 'Step';
  result: 'abandoned' | 'canceled' | 'failed' | 'skipped' | 'succeeded' | 'succeededWithIssues';
  errorCount: number;
  warningCount: number;
  startTime: Date;
  finishTime: Date;
};

export type BuildTimeline = {
  collectionName: string;
  project: string;
  buildId: number;
  buildDefinitionId: number;
  records: BuildTimelineRecord[];
  // TODO: Remove followinng fields once https://github.com/Automattic/mongoose/issues/12069 is closed
  createdAt?: Date;
  updatedAt?: Date;
};

const buildTimelineRecordSchema = new Schema<BuildTimelineRecord>({
  name: { type: String, required: true },
  order: { type: Number, required: true },
  type: { type: String, required: true },
  result: { type: String, required: true },
  errorCount: { type: Number, required: true },
  warningCount: { type: Number, required: true },
  startTime: { type: Date, required: true },
  finishTime: { type: Date, required: true }
});

const buildTimelineSchema = new Schema<BuildTimeline>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  buildId: { type: Number, required: true },
  buildDefinitionId: { type: Number, required: true },
  records: [buildTimelineRecordSchema]
}, {
  timestamps: true
});

buildTimelineSchema.index({
  collectionName: 1,
  project: 1,
  buildId: 1
});

buildTimelineSchema.index({
  collectionName: 1,
  project: 1,
  buildDefinitionId: 1
});

const BuildTimelineModel = model<BuildTimeline>('BuildTimeline', buildTimelineSchema);

export const saveBuildTimeline = (collectionName: string, project: string) => (
  async (buildId: number, buildDefinitionId: number, buildTimeline: Timeline | null) => (
    buildTimeline
      ? BuildTimelineModel
        .updateOne(
          {
            collectionName,
            project,
            buildId
          },
          { $set: { ...buildTimeline, buildDefinitionId } },
          { upsert: true }
        )
        .lean()
        .then(result => result.upsertedId)
      : null
  )
);

export const missingTimelines = (collectionName: string, project: string) => (
  async (buildIds: number[]) => {
    const existingBuildTimelines = await BuildTimelineModel
      .find({ collectionName, project, buildId: { $in: buildIds } }, { buildId: 1 })
      .lean();

    const existingBuildIds = new Set(existingBuildTimelines.map(bt => bt.buildId));

    return buildIds.filter(b => !existingBuildIds.has(b));
  }
);

const formatName = {
  $arrayElemAt: [{
    $split: [
      {
        $arrayElemAt: [{ $split: ['$records.name', '@'] }, 0]
      }, '/']
  }, 0]
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

  const results: Result[] = await BuildTimelineModel
    .aggregate([
      {
        $match: {
          collectionName,
          project,
          buildDefinitionId,
          createdAt: { $gt: queryFrom }
        }
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
                unit: 'millisecond'
              }
            }
          }
        }
      },
      { $sort: { averageTime: -1 } },
      { $match: { averageTime: { $gt: oneSecondInMs * 30 } } },
      { $limit: 7 }
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

  const results: Result[] = await BuildTimelineModel
    .aggregate([
      {
        $match: {
          collectionName,
          project,
          buildDefinitionId,
          createdAt: { $gt: queryFrom }
        }
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
                // eslint-disable-next-line unicorn/no-thenable
                then: 1,
                else: 0
              }
            }
          },
          continueOnError: {
            $addToSet: {
              $cond: {
                if: {
                  $and: [
                    { $gte: ['$records.errorCount', 1] },
                    { $eq: ['$records.result', 'succeeded'] }
                  ]
                },
                // eslint-disable-next-line unicorn/no-thenable
                then: true,
                else: false
              }
            }
          }
        }
      },
      { $sort: { errorCount: -1 } },
      { $match: { errorCount: { $gt: 0.05 } } },
      { $limit: 7 }
    ]);

  return results.map(r => ({
    name: r._id,
    errorCount: r.errorCount,
    continueOnError: r.continueOnError.flat().reduce(or, false)
  }));
};

export const aggregateBuildTimelineStats = async (
  collectionName: string,
  project: string,
  buildDefinitionId: number,
  queryFrom = getConfig().azure.queryFrom
) => {
  try {
    const [count, slowest, failing] = await Promise.all([
      BuildTimelineModel
        .find({
          collectionName,
          project,
          buildDefinitionId,
          queryFrom: { $gt: queryFrom }
        })
        .count(),
      getSlowestTasks(collectionName, project, buildDefinitionId, queryFrom),
      getFailing(collectionName, project, buildDefinitionId, queryFrom)
    ]);

    return { count, slowest, failing };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

// eslint-disable-next-line no-underscore-dangle
export const __BuildTimelineModelDONOTUSE = BuildTimelineModel;
