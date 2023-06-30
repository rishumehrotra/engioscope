import mongoose from 'mongoose';
import yaml from 'yaml';
import { z } from 'zod';
import { configForProject, getConfig } from '../config.js';

import { collectionAndProjectInputs, inDateRange } from './helpers.js';
import { BuildModel } from './mongoose-models/BuildModel.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';
import { getActivePipelineIds } from './build-definitions.js';
import { getDefaultBranchAndNameForRepoIds } from './repos.js';
import { normalizeBranchName } from '../utils.js';

const { Schema, model } = mongoose;

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
  centralTemplate: boolean | Record<string, string> | undefined; // boolean is for backwards compatibility
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
    centralTemplate: Schema.Types.Mixed,
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
        branch: report.branch,
        branchName: report.branchName,
        buildDefinitionId: report.buildDefinitionId,
        buildReason: report.buildReason,
        buildScript: report.buildScript,
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
  collectionName: string,
  project: string
) => {
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
