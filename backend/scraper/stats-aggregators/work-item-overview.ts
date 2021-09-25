import ms from 'ms';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import type { ParsedCollection } from '../parse-config';
import type { WorkItem, WorkItemType } from '../types-azure';
import { closedDate } from './work-item-utils';

const monthAgoInMs = Date.now() - ms('30 days');

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

        const closedOn = closedDate(workItem);
        if (closedOn && closedOn.getTime() > monthAgoInMs) {
          acc.closed[workItem.id] = closedOn.toISOString();
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
