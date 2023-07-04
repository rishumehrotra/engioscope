import { inDateRange } from './helpers.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import type { BuildDef } from './testruns.js';
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

export const getPipelineIds =
  (type: 'active' | 'nonActive') => (queryContext: QueryContext, repoIds: string[]) => {
    const { collectionName, project, startDate, endDate } = fromContext(queryContext);
    return BuildDefinitionModel.find({
      collectionName,
      project,
      repositoryId: { $in: repoIds },
      ...(type === 'active'
        ? { 'latestBuild.finishTime': inDateRange(startDate, endDate) }
        : { 'latestBuild.finishTime': { $lt: startDate } }),
    })
      .distinct('id')
      .lean()
      .exec() as Promise<number[]>;
  };

export const getActivePipelineIds = getPipelineIds('active');
export const getNonActivePipelineIds = getPipelineIds('nonActive');

export const getDefinitionListWithRepoInfo = (
  collectionName: string,
  project: string,
  repoIds: string[]
) => {
  return RepositoryModel.aggregate<BuildDef>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: repoIds },
      },
    },
    {
      $lookup: {
        from: 'builddefinitions',
        let: {
          collectionName: '$collectionName',
          project: '$project.name',
          repositoryId: '$id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$repositoryId', '$$repositoryId'] },
            },
          },
        ],
        as: 'pipeline',
      },
    },
    {
      $unwind: {
        path: '$pipeline',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        id: '$pipeline.id',
        name: '$pipeline.name',
        url: '$pipeline.url',
        repositoryName: '$name',
        repositoryId: '$id',
        repositoryUrl: '$url',
      },
    },
  ]).exec();
};
