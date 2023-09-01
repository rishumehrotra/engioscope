import { map, multiply, pipe, replace } from 'rambda';
import { z } from 'zod';
import { divide, exists } from '../../shared/utils.js';
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
import { getActiveRepos, type filteredReposInputParser } from './active-repos.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import { formatRepoUrlForUI } from './repos.js';

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

export const buildDefinitionWebUrl = pipe(
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
    { $sort: { finishTime: -1 } },
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

export const pipeLineBuildStatsInputParser = z.object({
  queryContext: queryContextInputParser,
  repositoryId: z.string(),
  pipelineType: z.enum(['yaml', 'non-yaml']).optional(),
});
export const getPipeLineBuildStatsForRepo = async ({
  queryContext,
  repositoryId,
  pipelineType,
}: z.infer<typeof pipeLineBuildStatsInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const pipelineTypeNum =
    pipelineType === 'yaml' ? 2 : pipelineType === 'non-yaml' ? 1 : undefined;

  return BuildDefinitionModel.aggregate<{
    definitionId: string;
    definitionUrl: string;
    definitionName: string;
    buildsCount: number;
    latestBuildTimestamp: Date | undefined;
    latestBuildResult: string | undefined;
    isYaml: boolean;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        ...(pipelineType ? { 'process.processType': pipelineTypeNum } : {}),
      },
    },
    { $sort: { finishTime: -1 } },
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
        isYaml: {
          $cond: {
            if: { $eq: ['$process.processType', 2] },
            then: true,
            else: false,
          },
        },
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

type PipelineItem = {
  hasDef: boolean;
  def: {
    id: number;
    latestBuildId?: number;
    latestCompletedBuildId?: number;
    name: string;
    process: {
      processType: number;
      yamlFileName: string;
    };
    repositoryId: string;
    type: 'build';
    url: string;
    latestBuild?: {
      id: number;
      status: string;
      result: string;
      queueTime: Date;
      startTime: Date;
      finishTime: Date;
    };
    latestCompletedBuild?: {
      id: number;
      status: string;
      result: string;
      queueTime: Date;
      startTime: Date;
      finishTime: Date;
    };
  };
} & (
  | { hasBuilds: false }
  | {
      hasBuilds: true;
      builds: {
        totalBuilds: number;
        totalSuccessfulBuilds: number;
        averageDuration: number;
        minDuration: number;
        maxDuration: number;
        buildDefinitionId: number;
        definitionName: string;
        url: string;
        lastBuildStatus: string;
        lastBuildTimestamp: Date;
        prCount: number;
        latestBuildResult: {
          result: string;
          timestamp: Date;
        };
        latestSuccessfulIndex: number;
        failingSince: {
          result: string;
          timestamp: Date;
        };
      };
    }
) &
  (
    | { hasAzureBuildReports: false }
    | {
        hasAzureBuildReports: true;
        azureBuildReports: {
          templateUsers: number;
          mainBranchCentralTemplateBuilds: number;
          totalAzureBuilds: number;
          buildDefinitionId: string;
        };
      }
  );

type BuildDrawerItem = {
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
  builds: number;
  pipelines: PipelineItem[];
};

export const getBuildsDrawerListing = async ({
  queryContext,
  searchTerms,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const activeRepos = await getActiveRepos(queryContext, searchTerms, teams);

  return RepositoryModel.aggregate<BuildDrawerItem>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: activeRepos.map(x => x.id) },
      },
    },
    {
      $lookup: {
        from: 'builddefinitions',
        let: { repositoryId: '$id' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$repositoryId', '$$repositoryId'] },
            },
          },
        ],
        as: 'defs',
      },
    },
    { $addFields: { hasDef: { $gt: [{ $size: '$defs' }, 0] } } },
    {
      $unwind: {
        path: '$defs',
        preserveNullAndEmptyArrays: false,
      },
    },
    { $addFields: { def: '$defs' } },
    { $project: { defs: 0 } },
    {
      $lookup: {
        from: 'azurebuildreports',
        let: {
          repositoryName: '$name',
          definitionId: {
            $toString: '$def.id',
          },
          defaultBranchName: {
            $replaceAll: {
              input: '$defaultBranch',
              find: 'refs/heads/',
              replacement: '',
            },
          },
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repo', '$$repositoryName'] },
                  { $eq: ['$buildDefinitionId', '$$definitionId'] },
                ],
              },
              createdAt: inDateRange(startDate, endDate),
            },
          },
          {
            $addFields: {
              usesCentralTemplate: {
                $or: [
                  { $eq: ['$centralTemplate', true] },
                  { $eq: [{ $type: '$centralTemplate' }, 'object'] },
                  { $eq: ['$templateRepo', 'build-pipeline-templates'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: { buildDefinitionId: '$buildDefinitionId' },
              templateUsers: {
                $sum: {
                  $cond: {
                    if: { $eq: ['$usesCentralTemplate', true] },
                    then: 1,
                    else: 0,
                  },
                },
              },
              mainBranchCentralTemplateBuilds: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$usesCentralTemplate', true] },
                        { $eq: ['$branchName', '$$defaultBranchName'] },
                      ],
                    },
                    then: 1,
                    else: 0,
                  },
                },
              },
              totalAzureBuilds: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              buildDefinitionId: '$_id.buildDefinitionId',
              templateUsers: 1,
              totalAzureBuilds: 1,
              mainBranchCentralTemplateBuilds: 1,
            },
          },
        ],
        as: 'azureBuildReports',
      },
    },
    {
      $addFields: { hasAzureBuildReports: { $gt: [{ $size: '$azureBuildReports' }, 0] } },
    },
    {
      $unwind: {
        path: '$azureBuildReports',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'builds',
        let: { repositoryId: '$id', definitionId: '$def.id' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repository.id', '$$repositoryId'] },
                  { $eq: ['$definition.id', '$$definitionId'] },
                ],
              },
              finishTime: inDateRange(startDate, endDate),
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
              builds: { $push: { result: '$result', timestamp: '$startTime' } },
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
                    $arrayElemAt: [
                      '$builds',
                      { $subtract: ['$latestSuccessfulIndex', 1] },
                    ],
                  },
                  else: {
                    result: '$lastBuildStatus',
                    timestamp: '$lastBuildTimestamp',
                  },
                },
              },
            },
          },
        ],
        as: 'builds',
      },
    },
    { $addFields: { hasBuilds: { $gt: [{ $size: '$builds' }, 0] } } },
    {
      $unwind: {
        path: '$builds',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$id',
        repositoryId: { $first: '$id' },
        repositoryName: { $first: '$name' },
        repositoryUrl: { $first: '$url' },
        defaultBranch: { $first: '$defaultBranch' },
        collectionName: { $first: '$collectionName' },
        project: { $first: '$project.name' },
        builds: { $sum: '$builds.totalBuilds' },
        pipelines: {
          $push: {
            hasDef: '$hasDef',
            def: '$def',
            hasAzureBuildReports: '$hasAzureBuildReports',
            hasBuilds: '$hasBuilds',
            builds: '$builds',
            azureBuildReports: '$azureBuildReports',
          },
        },
      },
    },
    {
      $project: {
        'pipelines.def._id': 0,
        'pipelines.def.createdAt': 0,
        'pipelines.def.updatedAt': 0,
        'pipelines.def.createdDate': 0,
        'pipelines.def.revision': 0,
        'pipelines.def.queueStatus': 0,
        'pipelines.def.collectionName': 0,
        'pipelines.def.project': 0,
        'pipelines.def.uri': 0,
        'pipelines.builds.builds': 0,
      },
    },
  ]).then(
    map(x => ({
      ...x,
      pipelines: x.pipelines.map(p => ({
        ...p,
        def: { ...p.def, url: buildDefinitionWebUrl(p.def.url) },
      })),
    }))
  );
};

export const getBuildPipelineListForDownload = async ({
  queryContext,
  searchTerms,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const repos = await getBuildsDrawerListing({
    queryContext,
    searchTerms,
    teams,
  });

  return repos.flatMap(repo => {
    return repo.pipelines.map(pipeline => {
      return {
        repositoryUrl: formatRepoUrlForUI(repo.repositoryUrl),
        repositoryName: repo.repositoryName,
        pipelineUrl: buildDefinitionWebUrl(pipeline.def.url),
        pipelineName: pipeline.def.name,
        pipelineType: pipeline.def.process.processType === 2 ? 'YAML' : 'Non YAML',
        totalBuilds: pipeline.hasBuilds ? pipeline.builds.totalBuilds : null,
        averageDuration:
          pipeline.hasBuilds && pipeline.builds.averageDuration > 0
            ? (pipeline.builds.averageDuration / 1000).toFixed(0)
            : null,
        successfulBuilds: pipeline.hasBuilds
          ? pipeline.builds.totalSuccessfulBuilds
          : null,
        successRate: pipeline.hasBuilds
          ? divide(
              pipeline.builds.totalSuccessfulBuilds || 0,
              pipeline.builds.totalBuilds || 0
            )
              .map(multiply(100))
              .getOr(0)
              .toFixed(0)
          : null,
        lastUsed: pipeline.hasBuilds
          ? pipeline.builds.latestBuildResult.timestamp
          : !pipeline.hasBuilds && pipeline.def.latestBuild
          ? pipeline.def.latestBuild?.finishTime
          : null,
        latestBuildStatus: pipeline.hasBuilds
          ? pipeline.builds.latestBuildResult.result
          : null,
        prsCount: pipeline.hasBuilds ? pipeline.builds.prCount : null,
        centralTemplateUsage: pipeline.hasAzureBuildReports
          ? pipeline.azureBuildReports.templateUsers
          : null,
      };
    });
  });
};
