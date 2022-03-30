import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { exists } from '../../../shared/utils';
import type { ParsedCollection, ParsedConfig } from '../parse-config';
import type { WorkItem, WorkItemType } from '../types-azure';

const getMinDate = (fields: string[], workItem: WorkItem) => {
  const possibleEndDates = fields
    .map(field => workItem.fields[field])
    .filter(exists)
    .map(endDate => new Date(endDate).getTime());

  return possibleEndDates.length > 0 ? new Date(Math.min(...possibleEndDates)) : undefined;
};

const wasClosedOutsideQueryPeriod = (
  workItem: WorkItem,
  config: ParsedConfig,
  workItemConfig: NonNullable<ParsedCollection['workitems']['types']>[number]
) => {
  const closeDate = getMinDate(workItemConfig.endDate, workItem);
  if (!closeDate) return false;
  return closeDate.getTime() < config.azure.queryFrom.getTime();
};

export const getOverviewData = (
  config: ParsedConfig,
  collection: ParsedCollection,
  workItemsForProject: WorkItem[],
  byId: Record<number, UIWorkItem>,
  types: Record<string, UIWorkItemType>,
  getWorkItemType: (workItem: WorkItem) => WorkItemType,
  relations: Record<number, number[]>
): Overview => {
  const groupCache = new Map<string, { id: string; witId: string; name: string }>();
  let groupIndex = 0;

  const results = workItemsForProject.reduce<{
    reducedIds: Record<number, UIWorkItem>;
    types: Record<string, UIWorkItemType>;
    groups: Overview['groups'];
    times: Overview['times'];
    relations: Record<number, number[]>;
  }>((acc, workItem) => {
    const wit = getWorkItemType(workItem);

    const workItemConfig = collection.workitems.types?.find(wic => wic.type === wit.name);
    if (!workItemConfig) return acc;
    if (wasClosedOutsideQueryPeriod(workItem, config, workItemConfig)) return acc;

    acc.reducedIds[workItem.id] = byId[workItem.id];
    acc.types[byId[workItem.id].typeId] = types[byId[workItem.id].typeId];

    acc.times[workItem.id] = {
      start: getMinDate(workItemConfig.startDate, workItem)?.toISOString(),
      end: getMinDate(workItemConfig.endDate, workItem)?.toISOString(),
      devComplete: getMinDate(workItemConfig.devCompletionDate, workItem)?.toISOString(),
      workCenters: workItemConfig.workCenters.map(wc => {
        const wcStartDate = getMinDate(wc.startDate, workItem);
        const wcEndDate = getMinDate(wc.endDate, workItem);
        if (!wcStartDate) return;

        return {
          label: wc.label,
          start: wcStartDate.toISOString(),
          end: wcEndDate ? wcEndDate.toISOString() : undefined
        };
      }).filter(exists)
    };

    if (workItemConfig.groupByField && workItem.fields[workItemConfig.groupByField]) {
      const groupName = workItem.fields[workItemConfig.groupByField];
      const groupCacheKey = wit + groupName;

      if (!groupCache.has(groupCacheKey)) {
        groupCache.set(groupCacheKey, {
          id: `g${groupIndex}`,
          witId: byId[workItem.id].typeId,
          name: groupName
        });
        groupIndex += 1;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { id, ...matchingGroup } = groupCache.get(groupCacheKey)!;
      acc.groups[id] = matchingGroup;
      acc.reducedIds[workItem.id].groupId = id;
    }

    if (wit.name === 'Feature' && relations[workItem.id]) {
      acc.relations[workItem.id] = relations[workItem.id].filter(
        id => byId[id]?.typeId
          && types[byId[id]?.typeId].name[0].toLowerCase().includes('bug')
      );
    }

    return acc;
  }, {
    reducedIds: {}, types: {}, groups: {}, times: {}, relations: {}
  });

  return {
    byId: results.reducedIds,
    types: results.types,
    groups: results.groups,
    times: results.times,
    relations: results.relations
  };
};
