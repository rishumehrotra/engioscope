import mongoose from 'mongoose';
import type { Timeline } from '../scraper/types-azure.js';

const { Schema, model } = mongoose;

export type BuildTimelineRecord = {
  name: string;
  order: number;
  type: 'Task' | 'Job' | 'Task' | 'Checkpoint' | 'Phase' | 'Stage';
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

// eslint-disable-next-line no-underscore-dangle
export const __BuildTimelineModelDONOTUSE = BuildTimelineModel;
