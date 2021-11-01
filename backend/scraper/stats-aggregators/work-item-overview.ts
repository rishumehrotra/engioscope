import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { exists, isNewerThan } from '../../utils';
import type { ParsedCollection, ParsedConfig } from '../parse-config';
import type { WorkItem, WorkItemType } from '../types-azure';

const getMinDate = (fields: string[], workItem: WorkItem) => {
  const possibleEndDates = fields
    .map(field => workItem.fields[field])
    .filter(exists)
    .map(endDate => new Date(endDate).getTime());

  return possibleEndDates.length > 0 ? new Date(Math.min(...possibleEndDates)) : undefined;
};

const stateChangedRecently = (validateDate: (x: Date) => boolean) => (workItem: WorkItem) => {
  const stageChangeDate = workItem.fields['Microsoft.VSTS.Common.StateChangeDate'];
  if (!stageChangeDate) return true; // Play safe
  return validateDate(stageChangeDate);
};

export const getOverviewData = (
  config: ParsedConfig,
  collection: ParsedCollection,
  workItemsForProject: WorkItem[],
  byId: Record<number, UIWorkItem>,
  types: Record<string, UIWorkItemType>,
  getWorkItemType: (workItem: WorkItem) => WorkItemType
): Overview => {
  const groupCache = new Map<string, { id: string; wit: string; label: string; name: string }>();
  let groupIndex = 0;
  const isInQueryPeriod = isNewerThan(config.azure.queryFrom);
  const changedRecently = stateChangedRecently(isInQueryPeriod);

  const results = workItemsForProject.reduce<{
    reducedIds: Record<number, UIWorkItem>;
    types: Record<string, UIWorkItemType>;
    groups: Overview['groups'];
    times: Overview['times'];
  }>((acc, workItem) => {
    const wit = getWorkItemType(workItem);

    const workItemConfig = collection.workitems.types?.find(wic => wic.type === wit.name);
    if (!changedRecently(workItem)) return acc;
    if (!workItemConfig) return acc;
    if (workItem.fields['System.State'] === 'Withdrawn') return acc;

    acc.reducedIds[workItem.id] = byId[workItem.id];
    acc.types[byId[workItem.id].typeId] = types[byId[workItem.id].typeId];

    acc.times[workItem.id] = {
      start: getMinDate(workItemConfig.startDate, workItem)?.toISOString(),
      end: getMinDate(workItemConfig.endDate, workItem)?.toISOString(),
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
          wit: wit.name,
          label: workItemConfig.groupLabel,
          name: groupName
        });
        groupIndex += 1;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { id, ...matchingGroup } = groupCache.get(groupCacheKey)!;
      acc.groups[id] = matchingGroup;
      acc.reducedIds[workItem.id].groupId = id;
    }

    return acc;
  }, {
    reducedIds: {}, types: {}, groups: {}, times: {}
  });

  return {
    byId: results.reducedIds,
    types: results.types,
    groups: results.groups,
    times: results.times
  };
};
