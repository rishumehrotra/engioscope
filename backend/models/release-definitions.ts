import type { PipelineStage } from 'mongoose';
import { model, Schema } from 'mongoose';
import pMemoize from 'p-memoize';
import ExpiryMap from 'expiry-map';
import { oneMinuteInMs, oneWeekInMs } from '../../shared/utils.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';
import { inDateRange } from './helpers.js';

export type ReleaseCondition = {
  conditionType: 'artifact' | 'environmentState' | 'event' | 'undefined';
  name: string;
  value: string;
};

export type ReleaseDefinitionEnvironment = {
  // Many properties have been skipped
  // https://learn.microsoft.com/en-us/rest/api/azure/devops/release/definitions/list?view=azure-devops-rest-5.1&tabs=HTTP#releasedefinitionenvironment
  id: number;
  name: string;
  rank: number;
  badgeUrl: string;
  conditions: ReleaseCondition[];
};

export type ReleaseDefinition = {
  collectionName: string;
  project: string;
  source: 'ibiza' | 'portalExtensionApi' | 'restApi' | 'undefined' | 'userInterface';
  revision: number;
  description?: string;
  createdById: string;
  createdOn: Date;
  modifiedById: string;
  modifiedOn: Date;
  isDeleted: boolean;
  environments: ReleaseDefinitionEnvironment[];
  releaseNameFormat: string;
  id: number;
  name: string;
  path: string;
  url: string;
};

const releaseDefinitionSchema = new Schema<ReleaseDefinition>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  id: { type: Number, required: true },
  source: { type: String, required: true },
  revision: { type: Number, required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  createdById: { type: String, required: true },
  createdOn: { type: Date, required: true },
  modifiedById: { type: String },
  modifiedOn: { type: Date },
  isDeleted: { type: Boolean, required: true },
  releaseNameFormat: { type: String, required: true },
  environments: [
    {
      id: { type: Number },
      name: { type: String },
      rank: { type: Number },
      ownerId: { type: String },
      badgeUrl: { type: String },
      conditions: [
        {
          conditionType: { type: String },
          name: { type: String },
          value: { type: String },
        },
      ],
    },
  ],
});

releaseDefinitionSchema.index({ collectionName: 1, project: 1, id: 1 }, { unique: true });

export const ReleaseDefinitionModel = model<ReleaseDefinition>(
  'ReleaseDefinition',
  releaseDefinitionSchema
);

export const getReleaseEnvironments = (
  collectionName: string,
  project: string,
  definitionId: number
) =>
  ReleaseDefinitionModel.findOne(
    { collectionName, project, id: definitionId },
    { environments: 1 }
  )
    .lean()
    .then(r => r?.environments);

const searchClause = (searchTerm?: string) => {
  if (!searchTerm) return {};
  if (/^repo:"(.*)"$/.test(searchTerm)) return {}; // If this is a repo search, skip other factors

  return {
    $or: [
      { name: { $regex: new RegExp(searchTerm, 'i') } },
      { 'environments.name': { $regex: new RegExp(searchTerm, 'i') } },
    ],
  };
};

const getMinimalReleaseDefinitionsInner = async (
  collectionName: string,
  project: string,
  searchTerm?: string,
  stageNameContaining?: string
) => {
  return ReleaseDefinitionModel.find(
    {
      collectionName,
      project,
      ...searchClause(searchTerm),
      ...(stageNameContaining
        ? { 'environments.name': { $regex: new RegExp(stageNameContaining, 'i') } }
        : {}),
    },
    { name: 1, id: 1, url: 1 }
  ).lean() as unknown as Promise<Pick<ReleaseDefinition, 'id' | 'name' | 'url'>[]>;
};

const cache = new ExpiryMap(5 * oneMinuteInMs);
export const getMinimalReleaseDefinitions = pMemoize(getMinimalReleaseDefinitionsInner, {
  cacheKey: x => JSON.stringify(x),
  cache,
});

const getTestsForReleasePipelineEnvironments = (
  queryContext: QueryContext,
  releaseDefinitionId: number,
  environmentDefinitionId?: number
): PipelineStage[] => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return [
    {
      $match: {
        collectionName,
        project,
        id: releaseDefinitionId,
      },
    },
    ...(environmentDefinitionId
      ? [
          {
            $addFields: {
              environments: {
                $filter: {
                  input: '$environments',
                  as: 'stats',
                  cond: { $eq: ['$$stats.id', environmentDefinitionId] },
                },
              },
            },
          },
        ]
      : []),
    {
      $unwind: {
        path: '$environments',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'releases',
        let: {
          releaseDefinitionId: '$id',
          environmentId: '$environments.id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$releaseDefinitionId', '$$releaseDefinitionId'] },
            },
          },
          {
            $unwind: {
              path: '$environments',
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$environments.definitionEnvironmentId', '$$environmentId'] },
                  { $gt: [{ $size: '$environments.deploySteps' }, 0] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 0,
              id: 1,
              environmentName: '$environments.name',
              environments: 1,
              releaseDefinitionId: 1,
              releaseDefinitionName: 1,
              releaseDefinitionRevision: 1,
            },
          },
        ],
        as: 'environmentReleases',
      },
    },
    {
      $unwind: {
        path: '$environmentReleases',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'testruns',
        let: {
          releaseId: '$environmentReleases.id',
          environmentId: '$environmentReleases.environments.id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              'project.name': project,
              '$expr': {
                $and: [
                  { $eq: ['$release.id', '$$releaseId'] },
                  { $eq: ['$release.environmentId', '$$environmentId'] },
                ],
              },
              ...(environmentDefinitionId
                ? { completedDate: { $lte: startDate } }
                : { completedDate: inDateRange(startDate, endDate) }),
              // NOTE - This is a workaround to make sure we will fetch the testruns,
              // where runStatistics array of object field is not empty.
              // This is happening because Azure itself is not storing the testruns in the database due to some type issue.
              'runStatistics.state': { $exists: true },
            },
          },
        ],
        as: 'tests',
      },
    },
    { $addFields: { hasTests: { $gt: [{ $size: '$tests' }, 0] } } },
    {
      $unwind: {
        path: '$tests',
        preserveNullAndEmptyArrays: false,
      },
    },
  ];
};

export const getTestsForReleaseDefinitionId = (
  queryContext: QueryContext,
  releaseDefinitionId: number
) => {
  const { startDate } = fromContext(queryContext);
  return ReleaseDefinitionModel.aggregate([
    ...getTestsForReleasePipelineEnvironments(queryContext, releaseDefinitionId),
    {
      $addFields: {
        'tests.weekIndex': {
          $trunc: {
            $divide: [{ $subtract: ['$tests.completedDate', startDate] }, oneWeekInMs],
          },
        },
      },
    },
    { $sort: { 'tests.completedDate': 1 } },
    {
      $group: {
        _id: {
          weekIndex: '$tests.weekIndex',
          environmentDefinitionId: '$environments.id',
        },
        releaseDefinitionId: { $first: '$id' },
        releaseDefinitionName: { $first: '$name' },
        releaseDefinitionUrl: { $first: '$url' },
        environmentDefinitionId: { $first: '$environments.id' },
        environmentName: { $first: '$environments.name' },
        releaseId: { $first: '$environmentReleases.id' },
        tests: { $last: '$tests' },
      },
    },
    {
      $group: {
        _id: '$environmentDefinitionId',
        releaseDefinitionId: { $first: '$releaseDefinitionId' },
        releaseDefinitionName: { $first: '$releaseDefinitionName' },
        releaseDefinitionUrl: { $first: '$releaseDefinitionUrl' },
        environmentDefinitionId: { $first: '$environmentDefinitionId' },
        environmentName: { $first: '$environmentName' },
        releaseId: { $first: '$releaseId' },
        tests: { $push: '$tests' },
      },
    },
    {
      $group: {
        _id: '$releaseDefinitionId',
        releaseDefinitionId: { $first: '$releaseDefinitionId' },
        environments: { $push: '$$ROOT' },
      },
    },
  ]);
};

export const getOneOldTestForEnvironmentId = (
  queryContext: QueryContext,
  releaseDefinitionId: number,
  environmentDefinitionId: number
) => {
  const { startDate } = fromContext(queryContext);
  return ReleaseDefinitionModel.aggregate([
    ...getTestsForReleasePipelineEnvironments(
      queryContext,
      releaseDefinitionId,
      environmentDefinitionId
    ),
    {
      $addFields: {
        'tests.weekIndex': {
          $trunc: {
            $divide: [{ $subtract: ['$tests.completedDate', startDate] }, oneWeekInMs],
          },
        },
      },
    },
    { $sort: { 'tests.completedDate': 1 } },
    { $limit: 1 },
  ]);
};
