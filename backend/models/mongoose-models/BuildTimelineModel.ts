import { model, Schema } from 'mongoose';

export type BuildTimelineRecord = {
  name: string;
  order: number;
  type: 'Task' | 'Job' | 'Checkpoint' | 'Phase' | 'Stage' | 'Step';
  result:
    | 'abandoned'
    | 'canceled'
    | 'failed'
    | 'skipped'
    | 'succeeded'
    | 'succeededWithIssues';
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
  finishTime: { type: Date, required: true },
});
const buildTimelineSchema = new Schema<BuildTimeline>(
  {
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    buildId: { type: Number, required: true },
    buildDefinitionId: { type: Number, required: true },
    records: [buildTimelineRecordSchema],
  },
  {
    timestamps: true,
  }
);
buildTimelineSchema.index({
  collectionName: 1,
  project: 1,
  buildId: 1,
});
buildTimelineSchema.index({
  collectionName: 1,
  project: 1,
  buildDefinitionId: 1,
});

export const BuildTimelineModel = model<BuildTimeline>(
  'BuildTimeline',
  buildTimelineSchema
);
