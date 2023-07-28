import { ConfigModel } from './mongoose-models/ConfigModel.js';

const getGlobalConfig = () =>
  ConfigModel.findOne({
    collectionName: null,
    project: null,
  }).lean();

const getCollectionConfig = (collectionName: string) =>
  ConfigModel.findOne({
    collectionName,
    project: null,
  }).lean();

export const getProjectConfig = async (collectionName: string, projectName: string) => {
  const [globalConfig, collectionConfig, projectConfig] = await Promise.all([
    getGlobalConfig(),
    getCollectionConfig(collectionName),
    ConfigModel.findOne({
      collectionName,
      project: projectName,
    }).lean(),
  ]);

  const merged = {
    ...globalConfig,
    ...collectionConfig,
    ...projectConfig,
  };

  return {
    ...merged,
    filterWorkItemsBy: merged.filterWorkItemsBy?.map(f => ({ ...f })),
    workItemsConfig: merged.workItemsConfig?.map(wic => {
      return {
        ...wic,
        startStates: wic.startStates || ['New'],
        endStates: wic.endStates || ['Closed'],
      };
    }),
  };
};

export type ParsedConfig = Awaited<ReturnType<typeof getProjectConfig>>;
