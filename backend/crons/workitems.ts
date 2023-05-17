import {
  collections,
  collectionsAndProjects,
  configForCollection,
  getConfig,
} from '../config.js';
import {
  getWorkItemUpdateDate,
  setWorkItemUpdateDate,
} from '../models/cron-update-dates.js';
import { WorkItemModel } from '../models/mongoose-models/WorkItem.js';
import { bulkUpsertWorkItems } from '../models/workitems.js';
import azure from '../scraper/network/azure.js';
import type {
  WorkItemQueryFlatResult,
  WorkItemQueryResult,
} from '../scraper/types-azure.js';
import { chunkArray, invokeSeries } from '../utils.js';

const formatDate = (date: Date) => `'${date.toISOString()}'`;

const buildQuery = (collection: string, workItemUpdateDate: Date | undefined) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const collectionConfig = configForCollection(collection)!;
  const queryStart = workItemUpdateDate
    ? formatDate(workItemUpdateDate)
    : "@startOfDay('-365d')";

  return `
    SELECT [System.Id]
    FROM workitems
    WHERE
      ${collectionConfig.workitems.getWorkItems
        .map(
          workItemType => `
        (
          [System.WorkItemType] = '${workItemType}'
          AND [Microsoft.VSTS.Common.StateChangeDate] > ${queryStart}
        )
      `
        )
        .join(' OR ')}
  `;
};

export const getWorkItems = () => {
  const { getCollectionWorkItemIdsForQuery, getCollectionWorkItemsAndRelationsChunks } =
    azure(getConfig());

  return Promise.all(
    collections().map(async collection => {
      const query = buildQuery(
        collection.name,
        await getWorkItemUpdateDate(collection.name)
      );

      const queryResult: WorkItemQueryResult<WorkItemQueryFlatResult> =
        await getCollectionWorkItemIdsForQuery(
          collection.name,
          query,
          'work-items-cron',
          true
        );
      await setWorkItemUpdateDate(collection.name);

      const workItemIds = queryResult.workItems.map(wi => wi.id);
      const workItemsPromises = getCollectionWorkItemsAndRelationsChunks(
        collection.name,
        workItemIds,
        'work-items-cron'
      );

      return Promise.all(
        workItemsPromises.map(p => p.then(bulkUpsertWorkItems(collection.name)))
      );
    })
  );
};

export const removeDeletedWorkItems = () => {
  return invokeSeries(chunkArray(collectionsAndProjects(), 10), async cnps => {
    await Promise.all(
      cnps.map(async ([{ name: collectionName }, { name: project }]) => {
        const { getDeletedWorkItems } = azure(getConfig());

        const deleted = await getDeletedWorkItems(collectionName, project);

        await WorkItemModel.deleteMany({
          collectionName,
          project,
          id: { $in: deleted.map(d => d.id) },
        });
      })
    );
  });
};
