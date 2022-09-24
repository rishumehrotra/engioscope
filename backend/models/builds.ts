import { model, Schema } from 'mongoose';
import { getConfig } from '../config.js';
import type {
  Build as AzureBuild, BuildReason, BuildResult, BuildStatus
} from '../scraper/types-azure.js';

export type Build = {
  id: number;
  buildNumber?: string;
  status: BuildStatus;
  result: BuildResult;
  queueTime: Date;
  startTime: Date;
  finishTime: Date;
  url: string;
  definition: {
    id: number;
    name: string;
    url: string;
  };
  buildNumberRevision: number;
  collectionName: string;
  project: string;
  uri: string;
  sourceBranch: string;
  sourceVersion: string;
  reason: BuildReason;
  requestedForId?: string;
  requestedById?: string;
  lastChangeDate: Date;
  lastChangedById?: string;
  parameters?: string;
  repository: {
    id: string;
    name: string;
  };
  keepForever?: boolean;
  retainedByRelease?: boolean;
  triggeredByBuildId?: number;
};

const buildSchema = new Schema<Build>({
  id: { type: Number, required: true },
  buildNumber: { type: String },
  status: { type: String, required: true },
  result: { type: String, required: true },
  queueTime: { type: Date, required: true },
  startTime: { type: Date, required: true },
  finishTime: { type: Date, required: true },
  url: { type: String, required: true },
  definition: {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true }
  },
  buildNumberRevision: { type: Number, required: true },
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  uri: { type: String, required: true },
  sourceBranch: { type: String, required: true },
  sourceVersion: { type: String, required: true },
  reason: { type: String, required: true },
  requestedForId: { type: String },
  requestedById: { type: String },
  lastChangeDate: { type: Date, required: true },
  lastChangedById: { type: String },
  parameters: { type: String },
  repository: {
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  keepForever: { type: Boolean },
  retainedByRelease: { type: Boolean },
  triggeredByBuildId: { type: Number }
}, { timestamps: true });

buildSchema.index({
  'collectionName': 1,
  'project': 1,
  'repository.id': 1
});

const BuildModel = model<Build>('Build', buildSchema);

export const saveBuild = (collectionName: string) => (build: AzureBuild) => {
  const { project, ...rest } = build;

  return (
    BuildModel
      .updateOne(
        {
          'collectionName': collectionName,
          'project': project.name,
          'repository.id': build.repository.id,
          'id': build.id
        },
        { $set: rest },
        { upsert: true }
      )
      .lean()
      .then(result => result.upsertedId)
  );
};

export const getBuilds = (
  collectionName: string, project: string,
  queryFrom = getConfig().azure.queryFrom
) => (
  BuildModel
    .find({ collectionName, project })
    .where({ startTime: { $gt: queryFrom } })
    .lean()
);

export const buildsByBuildIds = (collectionName: string, project: string) => (buildIds: number[]) => (
  BuildModel
    .find({ collectionName, project, buildId: { $in: buildIds } })
    .lean()
);
