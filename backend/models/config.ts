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
  const globalConfig = await getGlobalConfig();
  const collectionConfig = await getCollectionConfig(collectionName);
  const projectConfig = await ConfigModel.findOne({
    collectionName,
    project: projectName,
  }).lean();

  // override global config with collection config and then project config
  return {
    ...globalConfig,
    ...collectionConfig,
    ...projectConfig,
  };
};
