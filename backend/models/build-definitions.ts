import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';

export const getBuildDefinitionsForProject = (collectionName: string, project: string) =>
  BuildDefinitionModel.find({ collectionName, project }).lean();

export const getBuildDefinitionsForRepo = (options: {
  collectionName: string;
  project: string;
  repositoryId: string;
}) => {
  return BuildDefinitionModel.find(options).lean();
};

export const getBuildPipelineCount = (collectionName: string, project: string) =>
  BuildDefinitionModel.count({ collectionName, project }).count().exec();

export const getActivePipelineIds = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate } = fromContext(queryContext);
  const pipelines = await BuildDefinitionModel.aggregate<{
    ids: number[];
  }>([
    {
      $match: {
        collectionName,
        project,
        ...(repoIds ? { repositoryId: { $in: repoIds } } : {}),
      },
    },
    {
      $addFields: {
        isActive: {
          $cond: {
            if: { $gte: ['$latestBuild.finishTime', startDate] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        activePipelines: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$isActive', true] },
              then: '$id',
              else: null,
            },
          },
        },
        nonActivePipelines: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$isActive', false] },
              then: '$id',
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        ids: {
          $filter: {
            input: '$activePipelines',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
      },
    },
  ]);

  return pipelines[0] || { ids: [] };
};

export const getNonActivePipelineIds = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate } = fromContext(queryContext);
  const pipelines = await BuildDefinitionModel.aggregate<{
    ids: number[];
    activePipelines: number[];
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repoIds },
      },
    },
    {
      $addFields: {
        isActive: {
          $cond: {
            if: { $gte: ['$latestBuild.finishTime', startDate] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        nonActivePipelines: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$isActive', false] },
              then: '$id',
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        ids: {
          $filter: {
            input: '$nonActivePipelines',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
      },
    },
  ]);

  return pipelines[0] || { ids: [] };
};
