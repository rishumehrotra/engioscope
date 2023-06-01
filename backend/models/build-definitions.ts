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

export const getPipelineIds =
  (type: 'active' | 'nonActive') => (queryContext: QueryContext, repoIds: string[]) => {
    const { collectionName, project, startDate, endDate } = fromContext(queryContext);
    return BuildDefinitionModel.find({
      collectionName,
      project,
      repositoryId: { $in: repoIds },
      ...(type === 'active'
        ? { 'latestBuild.finishTime': { $gte: startDate, $lte: endDate } }
        : { 'latestBuild.finishTime': { $lt: startDate } }),
    })
      .distinct('id')
      .lean();
  };

export const getActivePipelineIds = getPipelineIds('active');
export const getNonActivePipelineIds = getPipelineIds('nonActive');
