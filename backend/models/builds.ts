import { pipe, replace } from 'rambda';
import { z } from 'zod';
import { exists } from '../../shared/utils.js';
import { getConfig } from '../config.js';
import azure from '../scraper/network/azure.js';
import type { Build as AzureBuild, BuildOverviewStats } from '../scraper/types-azure.js';
import { getBuildDefinitionsForRepo } from './build-definitions.js';
import { buildsCentralTemplateStats } from './build-reports.js';
import { inDateRange } from './helpers.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { BuildModel } from './mongoose-models/BuildModel.js';
import type { QueryContext } from './utils.js';
import { fromContext, queryContextInputParser } from './utils.js';

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
  ).then(result => result.upsertedId);
};

export const getBuilds = (
  collectionName: string,
  project: string,
  queryFrom = getConfig().azure.queryFrom
) =>
  BuildModel.find({ collectionName, project })
    .where({ startTime: { $gt: queryFrom } })
    .lean();

export const getBuildsOverviewForRepositoryInputParser = z.object({
  queryContext: queryContextInputParser,
  repositoryId: z.string(),
});

const buildDefinitionWebUrl = pipe(
  replace('_apis/build/Definitions/', '_build/definition?definitionId='),
  replace(/\?revision=.*/, '')
);

type BuildsResponse =
  | ({
      type: 'recent';
      centralTemplateCount: number;
      mainBranchCentralTemplateBuilds: number;
      ui: boolean;
    } & BuildOverviewStats)
  | {
      type: 'old';
      definitionName: string;
      url: string;
      buildDefinitionId: number;
      ui: boolean;
      centralTemplateCount: number;
      mainBranchCentralTemplateBuilds: number;
      latestBuildResult: string | undefined;
      latestBuildTime: Date | undefined;
      totalBuilds: number;
    };

export const getBuildFailingSince = async (
  collectionName: string,
  project: string,
  definitionId: number
) => {
  const result = await BuildModel.aggregate<{
    failingSince: {
      result: string;
      timestamp: Date;
    };
  }>([
    {
      $match: {
        project,
        collectionName,
        'definition.id': definitionId,
      },
    },
    { $sort: { finishTime: -1 } },
    {
      $group: {
        _id: null,
        lastBuildStatus: { $first: '$result' },
        lastBuildTimestamp: { $first: '$startTime' },
        builds: {
          $push: {
            result: '$result',
            timestamp: '$startTime',
          },
        },
      },
    },
    {
      $project: {
        lastBuildStatus: 1,
        lastBuildTimestamp: 1,
        _id: 0,
        builds: 1,
        latestBuildResult: { $arrayElemAt: ['$builds', 0] },
        latestSuccessfulIndex: {
          $indexOfArray: ['$builds.result', 'succeeded', 0],
        },
      },
    },
    {
      $addFields: {
        failingSince: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$lastBuildStatus', 'succeeded'] },
                { $gt: ['$latestSuccessfulIndex', 0] },
              ],
            },
            then: {
              $arrayElemAt: ['$builds', { $subtract: ['$latestSuccessfulIndex', 1] }],
            },
            else: {
              result: '$lastBuildStatus',
              timestamp: '$lastBuildTimestamp',
            },
          },
        },
      },
    },
    {
      $project: {
        failingSince: 1,
      },
    },
  ]);
  return result[0].failingSince;
};

export const getBuildsOverviewForRepository = async ({
  queryContext,
  repositoryId,
}: z.infer<typeof getBuildsOverviewForRepositoryInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const [result, buildTemplateCounts, buildDefinitions] = await Promise.all([
    Promise.all(
      await BuildModel.aggregate<BuildOverviewStats>([
        {
          $match: {
            project,
            collectionName,
            'repository.id': repositoryId,
            'finishTime': inDateRange(startDate, endDate),
          },
        },
        { $sort: { finishTime: -1 } },
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
                  0,
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
            lastBuildTimestamp: { $first: '$startTime' },
            builds: {
              $push: {
                result: '$result',
                timestamp: '$startTime',
              },
            },
            prCount: {
              $sum: {
                $cond: {
                  if: { $eq: ['$reason', 'pullRequest'] },
                  then: 0,
                  else: 1,
                },
              },
            },
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
            builds: 1,
            latestBuildResult: { $arrayElemAt: ['$builds', 0] },
            latestSuccessfulIndex: {
              $indexOfArray: ['$builds.result', 'succeeded', 0],
            },
            prCount: 1,
          },
        },
        {
          $addFields: {
            failingSince: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$lastBuildStatus', 'succeeded'] },
                    { $gt: ['$latestSuccessfulIndex', 0] },
                  ],
                },
                then: {
                  $arrayElemAt: ['$builds', { $subtract: ['$latestSuccessfulIndex', 1] }],
                },
                else: {
                  result: '$lastBuildStatus',
                  timestamp: '$lastBuildTimestamp',
                },
              },
            },
          },
        },
        { $unset: 'builds' },
      ]).then(result =>
        result.map(async build => {
          if (build.latestSuccessfulIndex !== -1) return build;

          const failing = await getBuildFailingSince(
            collectionName,
            project,
            build.buildDefinitionId
          );

          return { ...build, failingSince: failing };
        })
      )
    ),
    buildsCentralTemplateStats(queryContext, repositoryId),
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
          mainBranchCentralTemplateBuilds:
            buildTemplateCounts?.find(
              t => Number(t.buildDefinitionId) === buildDefinition.id
            )?.mainBranchCentralTemplateBuilds || 0,
          centralTemplateCount:
            buildTemplateCounts?.find(
              t => Number(t.buildDefinitionId) === buildDefinition.id
            )?.templateUsers || 0,
          totalBuilds:
            buildTemplateCounts?.find(
              t => Number(t.buildDefinitionId) === buildDefinition.id
            )?.totalAzureBuilds || 0,
        };
      }

      return {
        type: 'recent',
        ...buildStatsForDefinition,
        url: buildDefinitionWebUrl(buildStatsForDefinition.url),
        ui: buildDefinition.process.processType === 1,
        mainBranchCentralTemplateBuilds:
          buildTemplateCounts?.find(
            t => Number(t.buildDefinitionId) === buildDefinition.id
          )?.mainBranchCentralTemplateBuilds || 0,

        centralTemplateCount:
          buildTemplateCounts?.find(
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

export const NonYamlPipeLineBuildStatsInputParser1 = z.object({
  queryContext: queryContextInputParser,
  repositoryId: z.string(),
  buildDefIds: z.string().array(),
});
export const getNonYamlPipeLineBuildStats1 = async ({
  queryContext,
  repositoryId,
  buildDefIds,
}: z.infer<typeof NonYamlPipeLineBuildStatsInputParser1>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return BuildModel.aggregate<{
    buildDefinitionId: string;
    buildDefinitionName: string;
    buildDefinitionUrl: string;
    buildCount: number;
    lastUsed: Date;
    lastResult: string;
  }>([
    {
      $match: {
        collectionName,
        project,
        'repository.id': repositoryId,
        'definition.id': { $in: buildDefIds },
        'finishTime': inDateRange(startDate, endDate),
      },
    },
    {
      $sort: {
        finishTime: -1,
      },
    },
    {
      $group: {
        _id: '$definition.id',
        buildDefinitionId: { $first: '$definition.id' },
        buildDefinitionName: { $first: '$definition.name' },
        buildDefinitionUrl: { $first: '$definition.url' },
        buildCount: { $sum: 1 },
        lastUsed: { $first: '$finishTime' },
        lastResult: { $first: '$result' },
      },
    },
  ]).exec();
};

export const NonYamlPipeLineBuildStatsInputParser = z.object({
  queryContext: queryContextInputParser,
  repositoryId: z.string(),
});
export const getNonYamlPipeLineBuildStats = async ({
  queryContext,
  repositoryId,
}: z.infer<typeof NonYamlPipeLineBuildStatsInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return BuildDefinitionModel.aggregate<{
    definitionId: string;
    definitionUrl: string;
    definitionName: string;
    buildsCount: number;
    latestBuildTimestamp: Date;
    latestBuildResult: string;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        'process.processType': 1,
      },
    },
    {
      $sort: {
        finishTime: -1,
      },
    },
    {
      $lookup: {
        from: 'builds',
        let: {
          repositoryId: '$repositoryId',
          definitionId: '$id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repository.id', '$$repositoryId'] },
                  { $eq: ['$definition.id', '$$definitionId'] },
                  { $gt: ['$finishTime', startDate] },
                  { $lt: ['$finishTime', endDate] },
                ],
              },
            },
          },
        ],
        as: 'builds',
      },
    },
    {
      $project: {
        _id: 0,
        definitionId: '$id',
        definitionUrl: '$url',
        definitionName: '$name',
        buildsCount: { $size: '$builds' },
        latestBuildTimestamp: '$latestBuild.finishTime',
        latestBuildResult: '$latestBuild.result',
      },
    },
    { $sort: { buildsCount: -1 } },
  ]).exec();
};

export const getTotalBuildsForRepositoryIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return BuildModel.aggregate<{
    repositoryId: string;
    count: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        'repository.id': { $in: repositoryIds },
        'finishTime': inDateRange(startDate, endDate),
      },
    },
    {
      $group: {
        _id: '$repository.id',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        repositoryId: '$_id',
        count: 1,
      },
    },
  ]).exec();
};

export const getActivePipelineBuilds = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const totalBuilds = await BuildDefinitionModel.aggregate<{ totalBuilds: number }>([
    {
      $match: {
        collectionName,
        project,
        'repositoryId': { $in: repoIds },
        'latestBuild.finishTime': inDateRange(startDate, endDate),
      },
    },
    {
      $lookup: {
        from: 'builds',
        let: {
          repositoryId: '$repositoryId',
          definitionId: '$id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repository.id', '$$repositoryId'] },
                  { $eq: ['$definition.id', '$$definitionId'] },
                  { $gte: ['$finishTime', startDate] },
                  { $lt: ['$finishTime', endDate] },
                ],
              },
            },
          },
          { $count: 'total' },
        ],
        as: 'builds',
      },
    },
    {
      $unwind: {
        path: '$builds',
        includeArrayIndex: 'string',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: null,
        totalBuilds: {
          $sum: '$builds.total',
        },
      },
    },
  ]);

  return totalBuilds[0]?.totalBuilds ?? 0;
};
