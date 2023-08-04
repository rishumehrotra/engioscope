import pMemoize from 'p-memoize';
import ExpiryMap from 'expiry-map';
import { ConfigModel } from './mongoose-models/ConfigModel.js';
import { oneSecondInMs } from '../../shared/utils.js';

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

const cache = new ExpiryMap(10 * oneSecondInMs);

export const getProjectConfig = pMemoize(
  async (collectionName: string, projectName: string) => {
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
  },
  { cache, cacheKey: args => args.join('::') }
);

export type ParsedConfig = Awaited<ReturnType<typeof getProjectConfig>>;
