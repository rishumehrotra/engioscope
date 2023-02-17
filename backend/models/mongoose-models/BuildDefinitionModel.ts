import { model, Schema } from 'mongoose';
import type { BuildStatus, BuildResult } from '../../scraper/types-azure.js';

export type BuildDefinition = {
  collectionName: string;
  project: string;
  id: number;
  projectId: string;
  repositoryId?: string;
  name: string;
  createdDate?: Date | undefined;
  queueStatus: 'disabled' | 'enabled' | 'paused';
  revision: number;
  type: 'build' | 'xaml';
  uri: string;
  url: string;
  latestBuild?: {
    id: number;
    status: BuildStatus;
    result: BuildResult;
    queueTime: Date;
    startTime: Date;
    finishTime: Date;
  };
  latestCompletedBuild?: {
    id: number;
    status: BuildStatus;
    result: BuildResult;
    queueTime: Date;
    startTime: Date;
    finishTime: Date;
  };
  process: { processType: 1 } | { processType: 2; yamlFilename: string };
};

const buildDefinitionSchema = new Schema<BuildDefinition>(
  {
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    id: { type: Number, required: true },
    projectId: { type: String, required: true },
    repositoryId: { type: String },
    name: { type: String, required: true },
    createdDate: { type: Date },
    queueStatus: { type: String, required: true },
    revision: { type: Number, required: true },
    type: { type: String, required: true },
    uri: { type: String, required: true },
    url: { type: String, required: true },
    latestBuild: {
      id: { type: Number, required: true },
      status: { type: String, required: true },
      result: { type: String, required: true },
      queueTime: { type: Date, required: true },
      startTime: { type: Date, required: true },
      finishTime: { type: Date, required: true },
    },
    latestCompletedBuild: {
      id: { type: Number, required: true },
      status: { type: String, required: true },
      result: { type: String, required: true },
      queueTime: { type: Date, required: true },
      startTime: { type: Date, required: true },
      finishTime: { type: Date, required: true },
    },
    process: {
      processType: { type: Number, required: true },
      yamlFilename: { type: String },
    },
  },
  { timestamps: true }
);

buildDefinitionSchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
});

buildDefinitionSchema.index({
  collectionName: 1,
  project: 1,
  id: 1,
});

export const BuildDefinitionModel = model<BuildDefinition>(
  'BuildDefinition',
  buildDefinitionSchema
);
