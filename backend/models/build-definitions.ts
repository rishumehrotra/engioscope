import mongoose from 'mongoose';
import type {
  BuildDefinitionReference,
  BuildStatus,
  BuildResult,
} from '../scraper/types-azure.js';

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
                ...rest,
              },
            },
            upsert: true,
          },
        };
      })
    );

export const getBuildDefinitionsForProject = (collectionName: string, project: string) =>
  BuildDefinitionModel.find({ collectionName, project }).lean();

export const getBuildDefinitionsForRepo = (options: {
  collectionName: string;
  project: string;
  repositoryId: string;
}) => {
  return BuildDefinitionModel.find(options).lean();
};

export const getYamlPipelinesCountSummary = async (
  collectionName: string,
  project: string
) => {
  const result = await BuildDefinitionModel.aggregate<{
    totalCount: number;
    yamlCount: number;
  }>([
    {
      $match: {
        collectionName,
        project,
      },
    },
    {
      $group: {
        _id: {
          collectionName: '$collectionName',
          project: '$project',
        },
        totalCount: {
          $sum: 1,
        },
        yamlCount: {
          $sum: {
            $cond: {
              if: {
                $eq: ['$process.processType', 2],
              },
              then: 1,
              else: 0,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalCount: 1,
        yamlCount: 1,
      },
    },
  ]);

  return result[0] || { totalCount: 0, yamlCount: 0 };
};

export const getBuildPipelineCount = (collectionName: string, project: string) =>
  BuildDefinitionModel.count({ collectionName, project }).lean();
