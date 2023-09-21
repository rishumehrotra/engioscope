import mongoose from 'mongoose';
import yaml from 'yaml';
import { z } from 'zod';
import { asc, byNum } from 'sort-lib';
import { range } from 'rambda';
import { configForProject, getConfig } from '../config.js';
import { collectionAndProjectInputs, inDateRange } from './helpers.js';
import { BuildModel } from './mongoose-models/BuildModel.js';
import type { QueryContext } from './utils.js';
import { fromContext, weekIndexValue } from './utils.js';
import {
  getActivePipelineIds,
  getDefinitionListWithRepoInfo,
} from './build-definitions.js';
import { getDefaultBranchAndNameForRepoIds } from './repos.js';
import { createIntervals, normalizeBranchName } from '../utils.js';

const { Schema, model } = mongoose;

type SpecmaticCoverageReport = {
  type: 'git';
  repository: string;
  branch: string;
  specification: string;
  serviceType: string;
  operations: {
    path: string;
    method: string;
    responseCode: number;
    coverageStatus: string;
    exercised: number;
  }[];
}[];

type SpecmaticStubUsageReport = {
  type: 'git';
  repository: string;
  branch: string;
  specification: string;
  serviceType: string;
  operations: {
    path: string;
    method: string;
    responseCode: number;
    coverageStatus: string;
    executionCount: number;
  }[];
}[];

export type AzureBuildReport = {
  collectionName: string;
  collectionId: string;
  project: string;
  repo: string;
  repoId: string;
  branch: string;
  branchName: string;
  buildId: string;
  buildDefinitionId: string;
  buildReason:
    | 'Manual'
    | 'IndividualCI'
    | 'BatchedCI'
    | 'Schedule'
    | 'ValidateShelveset'
    | 'CheckInShelveset'
    | 'PullRequest'
    | 'ResourceTrigger';
  buildScript: string | undefined;
  templateRepo: string | undefined;
  sonarHost: string | undefined;
  sonarProjectKey: string | undefined;
  agentName: string | undefined;
  centralTemplate: boolean | Record<string, string> | undefined; // boolean is for backwards compatibility
  specmaticConfigPath: string | undefined;
  specmaticCoverage: SpecmaticCoverageReport | undefined;
  specmaticStubUsage: SpecmaticStubUsageReport | undefined;
};

const azureBuildReportSchema = new Schema<AzureBuildReport>(
  {
    collectionName: { type: String, required: true },
    collectionId: { type: String, required: true },
    project: { type: String, required: true },
    repo: { type: String, required: true },
    repoId: { type: String, required: true },
    branch: { type: String, required: true },
    branchName: { type: String, required: true },
    buildId: { type: String, required: true },
    buildDefinitionId: { type: String, required: true },
    buildReason: { type: String, required: true },
    buildScript: { type: String },
    templateRepo: String,
    sonarHost: String,
    sonarProjectKey: String,
    agentName: String,
    centralTemplate: Schema.Types.Mixed,
    specmaticConfigPath: String,
    specmaticCoverage: Schema.Types.Mixed,
    specmaticStubUsage: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

azureBuildReportSchema.index({
  collectionName: 1,
  project: 1,
  buildId: 1,
});

azureBuildReportSchema.index({
  collectionName: 1,
  project: 1,
  repo: 1,
  buildDefinitionId: 1,
});

export const AzureBuildReportModel = model<AzureBuildReport>(
  'AzureBuildReport',
  azureBuildReportSchema
);

const templateRepo = (buildScript: AzureBuildReport['buildScript']) => {
  if (!buildScript) return;

  const parsed = yaml.parse(buildScript);
  const possibleTemplate =
    (parsed.template as string) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (parsed.stages?.find((s: any) => s.template)?.template as string | undefined);
  if (!possibleTemplate) return;

  const parts = possibleTemplate.split('@');
  if (parts.length > 1) return parts[1];
  return possibleTemplate;
};

export const saveBuildReport = (report: Omit<AzureBuildReport, 'templateRepo'>) =>
  AzureBuildReportModel.updateOne(
    {
      collectionName: report.collectionName,
      project: report.project,
      buildId: report.buildId,
    },
    {
      $set: {
        repo: report.repo,
        repoId: report.repoId,
        branch: report.branch,
        branchName: report.branchName,
        buildDefinitionId: report.buildDefinitionId,
        buildReason: report.buildReason,
        buildScript: report.buildScript,
        agentName: report.agentName,
        ...(report.buildScript
          ? {
              templateRepo: templateRepo(report.buildScript),
            }
          : {}),
        ...(report.sonarHost
          ? {
              sonarHost: report.sonarHost,
              sonarProjectKey: report.sonarProjectKey,
            }
          : {}),
        centralTemplate: report.centralTemplate,
        ...(report.specmaticConfigPath
          ? {
              specmaticConfigPath: report.specmaticConfigPath,
              specmaticCoverage: report.specmaticCoverage,
              specmaticStubUsage: report.specmaticStubUsage,
            }
          : {}),
      },
    },
    { upsert: true }
  );

export const latestBuildReportsForRepo =
  (collectionName: string, project: string) => (repo: string) =>
    AzureBuildReportModel.aggregate<AzureBuildReport>([
      {
        $match: {
          collectionName,
          project,
          repo,
        },
      },
      {
        $group: {
          _id: '$buildDefinitionId',
          buildReports: {
            $max: { $mergeObjects: [{ updatedAt: '$updatedAt' }, '$$ROOT'] },
          },
        },
      },
      { $replaceRoot: { newRoot: '$buildReports' } },
    ]);

export const centralBuildTemplateBuildCount =
  (collectionName: string, project: string) =>
  async (buildDefinitionId: string, queryFrom = getConfig().azure.queryFrom) => {
    const projectConfig = configForProject(collectionName, project);
    const result: { centralTemplateUsageCount: number }[] =
      await AzureBuildReportModel.aggregate([
        {
          $match: {
            collectionName,
            project,
            buildDefinitionId,
            createdAt: { $gt: queryFrom },
          },
        },
        {
          $project: {
            usesCentralTemplate: {
              $or: [
                { $eq: ['$centralTemplate', true] },
                { $eq: [{ $type: '$centralTemplate' }, 'object'] },
                projectConfig?.templateRepoName
                  ? { $eq: ['$templateRepo', projectConfig.templateRepoName] }
                  : {},
              ],
            },
          },
        },
        { $match: { usesCentralTemplate: true } },
        { $count: 'centralTemplateUsageCount' },
      ]);
    return result[0]?.centralTemplateUsageCount ?? 0;
  };

export const centralTemplateOptionsInputParser = z.object({
  ...collectionAndProjectInputs,
  buildDefinitionId: z.string(),
});

export const centralTemplateOptions = async ({
  collectionName,
  project,
  buildDefinitionId,
}: z.infer<typeof centralTemplateOptionsInputParser>) => {
  const result: { centralTemplate: Record<string, string> }[] =
    await AzureBuildReportModel.aggregate([
      {
        $match: {
          collectionName,
          project,
          buildDefinitionId,
        },
      },
      {
        $addFields: {
          hasCentralTemplateData: {
            $or: [
              { $eq: ['$centralTemplate', true] },
              { $eq: [{ $type: '$centralTemplate' }, 'object'] },
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
      { $project: { centralTemplate: 1 } },
    ]);
  if (!result.length) return null;

  return Object.fromEntries(
    Object.entries(result[0].centralTemplate).map(([key, value]) => [
      key.trim().replaceAll('_', ' '),
      value.trim() === 'true' ? true : value.trim() === 'false' ? false : value.trim(),
    ])
  );
};

export const buildsCentralTemplateStats = async (
  queryContext: QueryContext,
  repositoryId: string
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const repo = await getDefaultBranchAndNameForRepoIds(queryContext, [repositoryId]).then(
    results => results[0]
  );

  if (!repo) return null;
  type CentralTemplateResult = {
    buildDefinitionId: string;
    templateUsers: number;
    totalAzureBuilds: number;
    mainBranchCentralTemplateBuilds: number;
  };

  return AzureBuildReportModel.aggregate<CentralTemplateResult>([
    {
      $match: {
        collectionName,
        project,
        repo: repo.name,
        createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) },
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
        _id: {
          collectionName: '$collectionName',
          project: '$project',
          repo: '$repo',
          buildDefinitionId: '$buildDefinitionId',
        },
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
                  {
                    $eq: [
                      '$branchName',
                      repo.defaultBranch
                        ? normalizeBranchName(repo.defaultBranch)
                        : undefined,
                    ],
                  },
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
  ]).exec();
};

export const getTotalCentralTemplateUsage = async (
  queryContext: QueryContext,
  repoNames?: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const centralTempBuildDefIDs = await AzureBuildReportModel.aggregate<{
    buildId: string;
  }>([
    {
      $match: {
        collectionName,
        project,
        ...(repoNames ? { repo: { $in: repoNames } } : {}),
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
    { $match: { usesCentralTemplate: true } },
    {
      $project: {
        _id: 0,
        buildId: 1,
      },
    },
  ]);

  if (centralTempBuildDefIDs?.length === 0) return { templateUsers: 0 };

  const count = await BuildModel.find({
    collectionName,
    project,
    id: { $in: centralTempBuildDefIDs.map(r => r.buildId) },
    finishTime: inDateRange(startDate, endDate),
  }).count();

  return { templateUsers: count };
};

export const getCentralTemplateBuildDefs = async (
  queryContext: QueryContext,
  repoNames: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    buildDefinitionId: string;
    collectionName: string;
    project: string;
    totalBuilds: number;
    centralTemplateBuilds: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        repo: { $in: repoNames },
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
        _id: '$buildDefinitionId',
        buildDefinitionId: { $first: '$buildDefinitionId' },
        collectionName: { $first: '$collectionName' },
        project: { $first: '$project' },
        totalBuilds: { $sum: 1 },
        centralTemplateBuilds: {
          $sum: {
            $cond: [{ $eq: ['$usesCentralTemplate', true] }, 1, 0],
          },
        },
      },
    },
    {
      $addFields: {
        buildDefinitionId: { $toInt: '$_id' },
      },
    },
    {
      $match: {
        centralTemplateBuilds: {
          $gt: 0,
        },
      },
    },
  ]).exec();
};

export const getActivePipelineCentralTemplateBuilds = async (
  queryContext: QueryContext,
  repoNames: string[],
  repoIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const activePipelines = await getActivePipelineIds(queryContext, repoIds);

  const centralTempBuildIds = await AzureBuildReportModel.aggregate<{
    buildId: string;
  }>([
    {
      $match: {
        collectionName,
        project,
        repo: { $in: repoNames },
        buildDefinitionId: { $in: activePipelines.map(String) },
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
    { $match: { usesCentralTemplate: true } },
    {
      $project: {
        _id: 0,
        buildId: 1,
      },
    },
  ]);

  if (centralTempBuildIds?.length === 0) return { count: 0 };

  const count = await BuildModel.find({
    collectionName,
    project,
    id: { $in: centralTempBuildIds.map(r => Number(r.buildId)) },
    ...(activePipelines && activePipelines.length > 0
      ? { 'definition.id': { $in: activePipelines } }
      : {}),
    finishTime: inDateRange(startDate, endDate),
  }).count();

  return { count } || { count: 0 };
};

export const getWeeklyApiCoveragePercentage = async (queryContext: QueryContext) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    weekIndex: number;
    buildDefinitionId: string;
    totalOperations: number;
    coveredOperations: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        createdAt: inDateRange(startDate, endDate),
        specmaticConfigPath: { $exists: true },
        specmaticCoverage: { $exists: true },
      },
    },
    { $unwind: '$specmaticCoverage' },
    { $match: { 'specmaticCoverage.serviceType': 'HTTP' } },
    {
      $addFields: {
        totalOperations: { $size: '$specmaticCoverage.operations' },
        coveredOperations: {
          $size: {
            $filter: {
              input: '$specmaticCoverage.operations',
              as: 'operation',
              cond: { $eq: ['$$operation.coverageStatus', 'covered'] },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$buildId',
        buildDefinitionId: { $first: '$buildDefinitionId' },
        totalOperations: { $sum: '$totalOperations' },
        coveredOperations: { $sum: '$coveredOperations' },
        createdAt: { $first: '$createdAt' },
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: {
          weekIndex: weekIndexValue(startDate, '$createdAt'),
          buildDefinitionId: '$buildDefinitionId',
        },
        totalOperations: { $last: '$totalOperations' },
        coveredOperations: { $last: '$coveredOperations' },
        latestBuildId: { $last: '$_id' },
      },
    },
    {
      $project: {
        _id: 0,
        weekIndex: '$_id.weekIndex',
        buildDefinitionId: '$_id.buildDefinitionId',
        totalOperations: 1,
        coveredOperations: 1,
        latestBuildId: 1,
      },
    },
  ]);
};

export const getOneOlderApiCoverageForBuildDefinition = async (
  queryContext: QueryContext,
  buildDefinitionId: string
) => {
  const { collectionName, project, startDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    buildId: string;
    buildDefinitionId: string;
    totalOperations: number;
    coveredOperations: number;
    createdAt: Date;
  }>([
    {
      $match: {
        collectionName,
        project,
        buildDefinitionId,
        createdAt: { $lt: startDate },
        specmaticConfigPath: { $exists: true },
        specmaticCoverage: { $exists: true },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 1 },
    { $unwind: '$specmaticCoverage' },
    { $match: { 'specmaticCoverage.serviceType': 'HTTP' } },
    {
      $addFields: {
        totalOperations: { $size: '$specmaticCoverage.operations' },
        coveredOperations: {
          $size: {
            $filter: {
              input: '$specmaticCoverage.operations',
              as: 'operation',
              cond: { $eq: ['$$operation.coverageStatus', 'covered'] },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$buildId',
        buildDefinitionId: { $first: '$buildDefinitionId' },
        totalOperations: { $sum: '$totalOperations' },
        coveredOperations: { $sum: '$coveredOperations' },
        createdAt: { $first: '$createdAt' },
      },
    },
    { $addFields: { buildId: '$_id' } },
    { $project: { _id: 0 } },
  ]).then(results => results[0] || null);
};

type apiCoverage = {
  weekIndex: number;
  buildDefinitionId: string;
  totalOperations: number;
  coveredOperations: number;
};

const makeApiCoverageContinuous = async (
  queryContext: QueryContext,
  buildDefId: number,
  coverageByWeek: apiCoverage[],
  numberOfIntervals: number
) => {
  const firstWeekCoverage = coverageByWeek?.find(coverage => coverage.weekIndex === 0);

  const olderCoverage = await getOneOlderApiCoverageForBuildDefinition(
    queryContext,
    buildDefId.toString()
  );

  const weeklyCoverage = firstWeekCoverage
    ? coverageByWeek
    : !firstWeekCoverage && olderCoverage
    ? [
        {
          weekIndex: 0,
          buildDefinitionId: buildDefId.toString(),
          totalOperations: olderCoverage.totalOperations,
          coveredOperations: olderCoverage.coveredOperations,
        },
        ...coverageByWeek,
      ]
    : [
        {
          weekIndex: 0,
          buildDefinitionId: buildDefId.toString(),
          totalOperations: 0,
          coveredOperations: 0,
        },
        ...coverageByWeek,
      ];

  return range(0, numberOfIntervals).reduce<
    {
      weekIndex: number;
      buildDefinitionId: string;
      totalOperations: number;
      coveredOperations: number;
    }[]
  >(
    (acc, weekIndex) => {
      const matchingCoverage = weeklyCoverage.find(
        coverage => coverage.weekIndex === weekIndex
      );
      if (matchingCoverage) {
        acc.push(matchingCoverage);
      } else {
        const lastCoverage = acc.at(-1);
        acc.push({
          weekIndex,
          buildDefinitionId: buildDefId.toString(),
          totalOperations: lastCoverage?.totalOperations || 0,
          coveredOperations: lastCoverage?.coveredOperations || 0,
        });
      }
      return acc;
    },
    [
      {
        weekIndex: 0,
        buildDefinitionId: buildDefId.toString(),
        totalOperations: 0,
        coveredOperations: 0,
      },
    ]
  );
};

export const getWeeklyApiCoverageSummary = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);
  const apiCoveragesForDefs = await getWeeklyApiCoveragePercentage(queryContext);

  const buildDefs = await getDefinitionListWithRepoInfo(
    collectionName,
    project,
    repositoryIds
  );

  const buildDefsWithCoverage = buildDefs.map(buildDef => {
    const matchingCoverages = apiCoveragesForDefs.filter(
      coverage => coverage.buildDefinitionId === buildDef.id.toString()
    );
    return {
      buildDefId: buildDef.id.toString(),
      coverageByWeek: matchingCoverages.sort(asc(byNum(w => w.weekIndex))),
    };
  });

  const continuousCoverage = await Promise.all(
    buildDefsWithCoverage.map(async ({ buildDefId, coverageByWeek }) => {
      return {
        buildDefId,
        coverageByWeek: await makeApiCoverageContinuous(
          queryContext,
          Number(buildDefId),
          coverageByWeek,
          numberOfIntervals
        ),
      };
    })
  );

  return range(0, numberOfIntervals).map(weekIndex => {
    const weekCoverage = continuousCoverage.reduce<{
      totalOperations: number;
      coveredOperations: number;
    }>(
      (acc, { coverageByWeek }) => {
        const matchingCoverage = coverageByWeek.find(
          coverage => coverage.weekIndex === weekIndex
        );
        if (matchingCoverage) {
          acc.totalOperations += matchingCoverage.totalOperations;
          acc.coveredOperations += matchingCoverage.coveredOperations;
        }
        return acc;
      },
      { totalOperations: 0, coveredOperations: 0 }
    );

    return {
      weekIndex,
      totalOperations: weekCoverage.totalOperations,
      coveredOperations: weekCoverage.coveredOperations,
    };
  });
};
