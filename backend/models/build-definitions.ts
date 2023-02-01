import mongoose from 'mongoose';
import type { BuildDefinitionReference } from '../scraper/types-azure.js';

const { Schema, model } = mongoose;

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
  latestBuildId?: number;
  latestCompletedBuildId?: number;
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
    latestBuildId: { type: Number },
    latestCompletedBuildId: { type: Number },
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

const BuildDefinitionModel = model<BuildDefinition>(
  'BuildDefinition',
  buildDefinitionSchema
);

export const bulkSaveBuildDefinitions =
  (collectionName: string) => (buildDefinitions: BuildDefinitionReference[]) =>
    BuildDefinitionModel.bulkWrite(
      buildDefinitions.map(buildDefinition => {
        const { project, process, ...rest } = buildDefinition;

        const processForDB =
          process.type === 2
            ? {
                processType: 2 as const,
                yamlFilename: process.yamlFilename,
              }
            : { processType: 1 as const };

        return {
          updateOne: {
            filter: {
              collectionName,
              project: project.name,
              id: buildDefinition.id,
            },
            update: {
              $set: {
                process: processForDB,
                repositoryId: buildDefinition.repository?.id,
                latestBuildId: rest.latestBuild?.id,
                latestCompletedBuildId: rest.latestCompletedBuild?.id,
                ...rest,
              },
            },
            upsert: true,
          },
        };
      })
    );

export const getBuildDefinitionsForRepo = (options: {
  collectionName: string;
  project: string;
  repositoryId: string;
}) => {
  return BuildDefinitionModel.find(options).lean();
};
