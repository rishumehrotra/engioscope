import pMemoize from 'p-memoize';
import ExpiryMap from 'expiry-map';
import { z } from 'zod';
import { ConfigModel } from './mongoose-models/ConfigModel.js';
import { oneSecondInMs } from '../../shared/utils.js';
import { collectionAndProjectInputs } from './helpers.js';

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

export const updateProjectConfigInputParser = z.object({
  ...collectionAndProjectInputs,
  config: z.array(
    z.object({
      type: z.string(),
      startStates: z.array(z.string()),
      endStates: z.array(z.string()),
      groupByField: z.string().optional(),
      rootCause: z.array(z.string()).optional(),
      ignoreStates: z.array(z.string()).optional(),
      workCenters: z
        .array(
          z.object({
            label: z.string(),
            startStates: z.array(z.string()).optional(),
            endStates: z.array(z.string()).optional(),
          })
        )
        .optional(),
    })
  ),
});

export const updateProjectConfig = async ({
  collectionName,
  project,
  config,
}: z.infer<typeof updateProjectConfigInputParser>) => {
  return ConfigModel.findOneAndUpdate(
    {
      collectionName,
      project,
    },
    {
      $set: {
        collectionName,
        project,
        workItemsConfig: config,
      },
    },
    { upsert: true }
  );
};

export type ParsedConfig = Awaited<ReturnType<typeof getProjectConfig>>;
