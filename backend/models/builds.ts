import { model, Schema } from 'mongoose';
import { z } from 'zod';
import { exists } from '../../shared/utils.js';
import { getConfig } from '../config.js';
import azure from '../scraper/network/azure.js';
import type {
  Build as AzureBuild, BuildReason, BuildResult, BuildStatus,
  BuildOverviewStats
} from '../scraper/types-azure.js';
import { collectionAndProjectInputs, dateRangeInputs } from './helpers.js';

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

export const bulkSaveBuilds = (collectionName: string) => (builds: AzureBuild[]) => (
  BuildModel.bulkWrite(builds.map(build => {
    const { project, ...rest } = build;

    return {
      updateOne: {
        filter: {
          collectionName,
          'project': project.name,
          'repository.id': build.repository.id,
          'id': build.id
        },
        update: { $set: rest },
        upsert: true
      }
    };
  }))
);

export const getBuilds = (
  collectionName: string, project: string,
  queryFrom = getConfig().azure.queryFrom
) => (
  BuildModel
    .find({ collectionName, project })
    .where({ startTime: { $gt: queryFrom } })
    .lean()
);

export const getBuildsOverviewForRepositoryInputParser = z.object({
  ...collectionAndProjectInputs,
  ...dateRangeInputs,
  repositoryId: z.string()
});

// Get Overview Stats for a specific repository
export const getBuildsOverviewForRepository = async ({
  collectionName,
  project,
  startDate,
  endDate,
  repositoryId

}: z.infer<typeof getBuildsOverviewForRepositoryInputParser>) => {
  // Make sure to send default start and end date values
  const result = await BuildModel.aggregate<BuildOverviewStats>([
    {
      '$match': {
        'project': project,
        'collectionName': collectionName,
        'repository.id': repositoryId,
        'startTime': { $gte: new Date(startDate), $lt: new Date(endDate) }
      }
    }, {
      '$sort': {
        'createdAt': -1
      }
    }, {
      '$group': {
        '_id': {
          'project': '$project',
          'collectionName': '$collectionName',
          'repositoryID': '$repository.id'
        },
        'totalBuilds': {
          '$sum': 1
        },
        'totalSuccessfulBuilds': {
          '$sum': {
            '$cond': {
              'if': {
                '$eq': [
                  '$result', 'succeeded'
                ]
              },
              // eslint-disable-next-line unicorn/no-thenable
              'then': 1,
              'else': 0
            }
          }
        },
        'averageDuration': {
          '$avg': {
            '$dateDiff': {
              'startDate': '$startTime',
              'endDate': '$finishTime',
              'unit': 'millisecond'
            }
          }
        },
        'minDuration': {
          '$min': {
            '$cond': [
              {
                '$gt': [
                  {
                    '$dateDiff': {
                      'startDate': '$startTime',
                      'endDate': '$finishTime',
                      'unit': 'millisecond'
                    }
                  }, 0
                ]
              }, {
                '$dateDiff': {
                  'startDate': '$startTime',
                  'endDate': '$finishTime',
                  'unit': 'millisecond'
                }
              }, null
            ]
          }
        },
        'maxDuration': {
          '$max': {
            '$dateDiff': {
              'startDate': '$startTime',
              'endDate': '$finishTime',
              'unit': 'millisecond'
            }
          }
        },
        'lastBuildStatus': {
          '$first': '$status'
        },
        'lastBuildTimestamp': {
          '$first': '$finishTime'
        }
      }
    }, {
      '$project': {
        'totalBuilds': 1,
        'totalSuccessfulBuilds': 1,
        'averageDuration': 1,
        'minDuration': 1,
        'maxDuration': 1,
        'lastBuildStatus': 1,
        'lastBuildTimestamp': 1,
        '_id': 0,
        'project': '$_id.project',
        'collectionName': '$_id.collectionName',
        'repositoryID': '$_id.repositoryID'
      }
    }
  ]);

  return result;
};

const getOneBuildPerDefinitionId = async (
  collectionName: string,
  project: string,
  buildDefinitionIds: number[],
  queryBefore = getConfig().azure.queryFrom
) => {
  const builds = await Promise.all(buildDefinitionIds.map(buildDefinitionId => (
    BuildModel
      .findOne({ collectionName, project, 'definition.id': buildDefinitionId })
      .where({ startTime: { $lte: queryBefore } })
      .sort({ startTime: -1 })
      .lean()
  )));

  return builds.filter(exists);
};

export const getOneBuildBeforeQueryPeriod = (collectionName: string, project: string) => (
  async (buildDefinitionIds: number[], queryBefore = getConfig().azure.queryFrom) => {
    const foundBuilds = await getOneBuildPerDefinitionId(
      collectionName, project, buildDefinitionIds, queryBefore
    );

    const foundBuildDefinitionIds = foundBuilds.reduce((acc, build) => {
      acc.add(build.definition.id);
      return acc;
    }, new Set<number>());

    const missingBuildIds = buildDefinitionIds.filter(bdi => !foundBuildDefinitionIds.has(bdi));

    const { getOneBuildBeforeQueryPeriod } = azure(getConfig());

    const additionalBuilds = await getOneBuildBeforeQueryPeriod(collectionName, project)(missingBuildIds);

    await Promise.all(additionalBuilds.map(saveBuild(collectionName)));

    const refetchedAdditionalBuilds = await getOneBuildPerDefinitionId(
      collectionName, project, additionalBuilds.map(b => b.definition.id), queryBefore
    );

    return [...foundBuilds, ...refetchedAdditionalBuilds];
  }
);

// eslint-disable-next-line no-underscore-dangle
export const __BuildModelDONOTUSE = BuildModel;
