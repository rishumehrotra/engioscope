import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import type { ParsedCollection } from '../parse-config';
import type { WorkItem, WorkItemType } from '../types-azure';

const closedDate = (workItem: WorkItem) => (
  workItem.fields['Microsoft.VSTS.Common.ClosedDate']
);

export const getOverviewData = (
  collection: ParsedCollection,
  workItemsForProject: WorkItem[],
  byId: Record<number, UIWorkItem>,
  types: Record<string, UIWorkItemType>,
  getWorkItemType: (workItem: WorkItem) => WorkItemType
): Overview => {
  const results = workItemsForProject
    .reduce<{
      closed: Record<number, string>;
      reducedIds: Record<number, UIWorkItem>;
      types: Record<string, UIWorkItemType>;
      featureTypes: Record<number, string>;
    }>(
      (acc, workItem) => {
        const wit = getWorkItemType(workItem);
        if (
          (collection.workitems.ignoredWorkItemsForFlowAnalysis || [])
            .includes(wit.name)
        ) return acc;

        if (closedDate(workItem)) {
          acc.closed[workItem.id] = closedDate(workItem).toISOString();
          acc.reducedIds[workItem.id] = byId[workItem.id];
          acc.types[byId[workItem.id].typeId] = types[byId[workItem.id].typeId];
        }

        if (
          wit.name === 'Feature'
          && collection.workitems.featureTypeField
          && workItem.fields[collection.workitems.featureTypeField]
        ) {
          acc.featureTypes[workItem.id] = workItem.fields[collection.workitems.featureTypeField];
        }

        return acc;
      },
      {
        closed: {}, reducedIds: {}, types: {}, featureTypes: {}
      }
    );

  return {
    byId: results.reducedIds,
    types: results.types,
    closed: results.closed,
    featureTypes: results.featureTypes
  };
};
