import { last } from 'rambda';
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
import {
  WorkItemStateChangesModel,
  type WorkItemStateChanges,
} from '../models/mongoose-models/WorkItemStateChanges.js';
import { bulkUpsertWorkItems } from '../models/workitems.js';
import azure from '../scraper/network/azure.js';
import type {
  WorkItemQueryFlatResult,
  WorkItemQueryResult,
} from '../scraper/types-azure.js';
import { chunkArray, invokeSeries } from '../utils.js';
import { HTTPError, is404 } from '../scraper/network/http-error.js';

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

export const updateWorkItemStateChanges = (
  collectionName: string,
  workItemIds: number[]
) => {
  const { getWorkItemRevisions } = azure(getConfig());

  return Promise.all(
    chunkArray(workItemIds, 20).map(chunk => {
      return Promise.all(
        chunk.map(async wiId => {
          try {
            const revisions = await getWorkItemRevisions(collectionName)(wiId);

            const stateChanges = revisions.reduce<WorkItemStateChanges['stateChanges']>(
              (acc, rev) => {
                if (!acc.length) {
                  acc.push({
                    state: rev.fields['System.State'],
                    date: rev.fields['System.ChangedDate'],
                  });
                  return acc;
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const lastEntry = last(acc)!;
                if (rev.fields['System.State'] !== lastEntry.state) {
                  acc.push({
                    state: rev.fields['System.State'],
                    date: rev.fields['System.ChangedDate'],
                  });
                }

                return acc;
              },
              []
            );

            return WorkItemStateChangesModel.findOneAndUpdate(
              { collectionName, id: wiId },
              {
                $set: {
                  project: last(revisions)?.fields['System.TeamProject'],
                  workItemType: last(revisions)?.fields['System.WorkItemType'],
                  stateChanges,
                },
              },
              { upsert: true }
            );
          } catch (error) {
            if (error instanceof HTTPError && is404(error)) {
              return WorkItemModel.deleteOne({ collectionName, id: wiId });
            }
            throw error;
          }
        })
      );
    })
  );
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

      const workItemIds = queryResult.workItems.map(wi => wi.id);

      await Promise.all([
        getCollectionWorkItemsAndRelationsChunks(
          collection.name,
          workItemIds,
          'work-items-cron',
          bulkUpsertWorkItems(collection.name)
        ),
        updateWorkItemStateChanges(collection.name, workItemIds),
      ]);

      await setWorkItemUpdateDate(collection.name);
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
