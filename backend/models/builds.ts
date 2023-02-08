import { model, Schema } from 'mongoose';
import { pipe, replace } from 'rambda';
import { z } from 'zod';
import { exists } from '../../shared/utils.js';
import { getConfig } from '../config.js';
import azure from '../scraper/network/azure.js';
import type {
  Build as AzureBuild,
  BuildReason,
  BuildResult,
  BuildStatus,
  BuildOverviewStats,
} from '../scraper/types-azure.js';
import { getBuildDefinitionsForRepo } from './build-definitions.js';
import { buildsCentralTemplateStats } from './build-reports.js';
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

const buildSchema = new Schema<Build>(
  {
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
      url: { type: String, required: true },
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
      name: { type: String, required: true },
    },
    keepForever: { type: Boolean },
    retainedByRelease: { type: Boolean },
    triggeredByBuildId: { type: Number },
  },
  { timestamps: true }
);

buildSchema.index({
  'collectionName': 1,
  'project': 1,
  'repository.id': 1,
});

export const BuildModel = model<Build>('Build', buildSchema);

export const saveBuild = (collectionName: string) => (build: AzureBuild) => {
  const { project, ...rest } = build;

  return BuildModel.updateOne(
    {
      collectionName,
      'project': project.name,
      'repository.id': build.repository.id,
      'id': build.id,
    },
    { $set: rest },
    { upsert: true }
  )
    .lean()
    .then(result => result.upsertedId);
};

export const bulkSaveBuilds = (collectionName: string) => (builds: AzureBuild[]) =>
  BuildModel.bulkWrite(
    builds.map(build => {
      const { project, ...rest } = build;

      return {
        updateOne: {
          filter: {
            collectionName,
            'project': project.name,
            'repository.id': build.repository.id,
            'id': build.id,
          },
          update: { $set: rest },
          upsert: true,
        },
      };
    })
  );

export const getBuilds = (
  collectionName: string,
  project: string,
  queryFrom = getConfig().azure.queryFrom
) =>
  BuildModel.find({ collectionName, project })
    .where({ startTime: { $gt: queryFrom } })
    .lean();

export const getBuildsOverviewForRepositoryInputParser = z.object({
  ...collectionAndProjectInputs,
  ...dateRangeInputs,
  repositoryName: z.string(),
  repositoryId: z.string(),
});

const buildDefinitionWebUrl = pipe(
  replace('_apis/build/Definitions/', '_build/definition?definitionId='),
  replace(/\?revision=.*/, '')
);

export const deleteBuildsForRepoIds = (
  collectionName: string,
  project: string,
  ids: string[]
) => {
  return BuildModel.deleteMany({
    collectionName,
    project,
    'repository.id': { $in: ids },
  });
};

type BuildsResponse =
  | ({ type: 'recent'; centralTemplateCount: number; ui: boolean } & BuildOverviewStats)
  | {
      type: 'old';
      definitionName: string;
      url: string;
      buildDefinitionId: number;
      ui: boolean;
      centralTemplateCount: number;
      latestBuildResult: string | undefined;
      latestBuildTime: Date | undefined;
      totalBuilds: number;
    };

// Get Overview Stats for a specific repository
export const getBuildsOverviewForRepository = async ({
  collectionName,
  project,
  startDate,
  endDate,
  repositoryName,
  repositoryId,
}: z.infer<typeof getBuildsOverviewForRepositoryInputParser>) => {
  // Make sure to send default start and end date values
  const [result, buildTemplateCounts, buildDefinitions] = await Promise.all([
    BuildModel.aggregate<BuildOverviewStats>([
      {
        $match: {
          project,
          collectionName,
          'repository.id': repositoryId,
          'startTime': { $gte: new Date(startDate), $lt: new Date(endDate) },
        },
      },
      { $sort: { startTime: -1 } },
      {
        $group: {
          _id: {
            project: '$project',
            collectionName: '$collectionName',
            repositoryId: '$repository.id',
            definitionId: '$definition.id',
          },
          totalBuilds: { $sum: 1 },
          totalSuccessfulBuilds: {
            $sum: {
              $cond: {
                if: { $eq: ['$result', 'succeeded'] },
                then: 1,
                else: 0,
              },
            },
          },
          averageDuration: {
            $avg: {
              $dateDiff: {
                startDate: '$startTime',
                endDate: '$finishTime',
                unit: 'millisecond',
              },
            },
          },
          minDuration: {
            $min: {
              $cond: [
                {
                  $gt: [
                    {
                      $dateDiff: {
                        startDate: '$startTime',
                        endDate: '$finishTime',
                        unit: 'millisecond',
                      },
                    },
                    0,
                  ],
                },
                {
                  $dateDiff: {
                    startDate: '$startTime',
                    endDate: '$finishTime',
                    unit: 'millisecond',
                  },
                },
                null,
              ],
            },
          },
          maxDuration: {
            $max: {
              $dateDiff: {
                startDate: '$startTime',
                endDate: '$finishTime',
                unit: 'millisecond',
              },
            },
          },
          buildDefinitionId: { $first: '$definition.id' },
          definitionName: { $first: '$definition.name' },
          url: { $first: '$definition.url' },
          lastBuildStatus: { $first: '$result' },
          lastBuildTimestamp: { $first: '$finishTime' },
        },
      },
      {
        $project: {
          totalBuilds: 1,
          totalSuccessfulBuilds: 1,
          averageDuration: 1,
          minDuration: 1,
          maxDuration: 1,
          lastBuildStatus: 1,
          lastBuildTimestamp: 1,
          _id: 0,
          url: 1,
          buildDefinitionId: 1,
          definitionName: 1,
          project: '$_id.project',
          collectionName: '$_id.collectionName',
          repositoryID: '$_id.repositoryID',
        },
      },
    ]),
    buildsCentralTemplateStats(
      collectionName,
      project,
      repositoryName,
      startDate,
      endDate
    ),
    getBuildDefinitionsForRepo({
      collectionName,
      project,
      repositoryId,
    }),
  ]);

  return buildDefinitions
    .map((buildDefinition): BuildsResponse => {
      const buildStatsForDefinition = result.find(
        r => r.buildDefinitionId === buildDefinition.id
      );

      if (!buildStatsForDefinition) {
        return {
          type: 'old',
          url: buildDefinitionWebUrl(buildDefinition.url),
          definitionName: buildDefinition.name,
          buildDefinitionId: buildDefinition.id,
          ui: buildDefinition.process.processType === 1,
          latestBuildResult: buildDefinition.latestBuild?.result,
          latestBuildTime: buildDefinition.latestBuild?.startTime,
          centralTemplateCount:
            buildTemplateCounts.find(
              t => Number(t.buildDefinitionId) === buildDefinition.id
            )?.templateUsers || 0,
          totalBuilds:
            buildTemplateCounts.find(
              t => Number(t.buildDefinitionId) === buildDefinition.id
            )?.totalAzureBuilds || 0,
        };
      }

      return {
        type: 'recent',
        ...buildStatsForDefinition,
        url: buildDefinitionWebUrl(buildStatsForDefinition.url),
        ui: buildDefinition.process.processType === 1,
        centralTemplateCount:
          buildTemplateCounts.find(
            t => Number(t.buildDefinitionId) === buildDefinition.id
          )?.templateUsers || 0,
      };
    })
    .filter(exists)
    .sort((a, b) => {
      if (a.type === 'recent' && b.type === 'old') return -1;
      if (a.type === 'old' && b.type === 'recent') return 1;

      if (a.type === 'old' && b.type === 'old') {
        if (a.latestBuildTime === undefined || b.latestBuildTime === undefined) {
          return 0;
        }
        return b.latestBuildTime.getTime() - a.latestBuildTime.getTime();
      }

      if (a.type === 'recent' && b.type === 'recent') {
        return b.totalBuilds - a.totalBuilds;
      }
      return 0;
    });
};

const getOneBuildPerDefinitionId = async (
  collectionName: string,
  project: string,
  buildDefinitionIds: number[],
  queryBefore = getConfig().azure.queryFrom
) => {
  const builds = await Promise.all(
    buildDefinitionIds.map(buildDefinitionId =>
      BuildModel.findOne({ collectionName, project, 'definition.id': buildDefinitionId })
        .where({ startTime: { $lte: queryBefore } })
        .sort({ startTime: -1 })
        .lean()
    )
  );

  return builds.filter(exists);
};

export const getOneBuildBeforeQueryPeriod =
  (collectionName: string, project: string) =>
  async (buildDefinitionIds: number[], queryBefore = getConfig().azure.queryFrom) => {
    const foundBuilds = await getOneBuildPerDefinitionId(
      collectionName,
      project,
      buildDefinitionIds,
      queryBefore
    );

    const foundBuildDefinitionIds = foundBuilds.reduce((acc, build) => {
      acc.add(build.definition.id);
      return acc;
    }, new Set<number>());

    const missingBuildIds = buildDefinitionIds.filter(
      bdi => !foundBuildDefinitionIds.has(bdi)
    );

    const { getOneBuildBeforeQueryPeriod } = azure(getConfig());

    const additionalBuilds = await getOneBuildBeforeQueryPeriod(
      collectionName,
      project
    )(missingBuildIds);

    await Promise.all(additionalBuilds.map(saveBuild(collectionName)));

    const refetchedAdditionalBuilds = await getOneBuildPerDefinitionId(
      collectionName,
      project,
      additionalBuilds.map(b => b.definition.id),
      queryBefore
    );

    return [...foundBuilds, ...refetchedAdditionalBuilds];
  };

export const getActiveRepoIds = async (
  collectionName: string,
  project: string,
  startDate: Date,
  endDate: Date,
  searchTerm?: string
) => {
  const result = await BuildModel.aggregate<{
    id: string;
    buildsCount: number;
    name: string;
  }>([
    {
      $match: {
        collectionName,
        project,
        ...(searchTerm
          ? {
              'repository.name': { $regex: new RegExp(searchTerm, 'i') },
            }
          : {}),
        startTime: {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: '$repository.id',
        name: { $first: '$repository.name' },
        buildsCount: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        buildsCount: 1,
        name: 1,
      },
    },
  ]);

  return result;
};

// eslint-disable-next-line no-underscore-dangle
export const __BuildModelDONOTUSE = BuildModel;
