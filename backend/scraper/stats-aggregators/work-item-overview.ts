import ms from 'ms';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { exists } from '../../utils';
import type { ParsedCollection } from '../parse-config';
import type { WorkItem, WorkItemType } from '../types-azure';

const monthAgoInMs = Date.now() - ms('30 days');

const getEndDate = (workItem: WorkItem, workItemConfig: NonNullable<ParsedCollection['workitems']['types']>[number]) => (
  workItem.fields[workItemConfig.endDate]
    ? new Date(workItem.fields[workItemConfig.endDate])
    : undefined
);

export const getOverviewData = (
  collection: ParsedCollection,
  workItemsForProject: WorkItem[],
  byId: Record<number, UIWorkItem>,
  types: Record<string, UIWorkItemType>,
  getWorkItemType: (workItem: WorkItem) => WorkItemType
): Overview => {
  const groupCache = new Map<string, { id: string; wit: string; label: string; name: string }>();
  let groupIndex = 0;

  const results = workItemsForProject.reduce<{
    closed: Record<number, string>;
    reducedIds: Record<number, UIWorkItem>;
    types: Record<string, UIWorkItemType>;
    groups: Overview['groups'];
    wiMeta: Overview['wiMeta'];
  }>((acc, workItem) => {
    const wit = getWorkItemType(workItem);

    const workItemConfig = collection.workitems.types?.find(wic => wic.type === wit.name);
    if (!workItemConfig) return acc;
    if (workItem.fields['System.State'] === 'Withdrawn') return acc;

    acc.reducedIds[workItem.id] = byId[workItem.id];
    acc.types[byId[workItem.id].typeId] = types[byId[workItem.id].typeId];

    acc.wiMeta[workItem.id] = {
      start: workItem.fields[workItemConfig.startDate]
        ? new Date(workItem.fields[workItemConfig.startDate]).toISOString()
        : new Date(workItem.fields['System.CreatedDate']).toISOString(),
      end: getEndDate(workItem, workItemConfig)?.toISOString(),
      workCenters: workItemConfig.workCenters.map(wc => {
        if (!workItem.fields[wc.startDate] || !workItem.fields[wc.endDate]) return;
        return {
          label: wc.label,
          time: (
            new Date(workItem.fields[wc.endDate]).getTime()
            - new Date(workItem.fields[wc.startDate]).getTime()
          )
        };
      }).filter(exists)
    };

    const closedOn = getEndDate(workItem, workItemConfig);
    if (closedOn && closedOn.getTime() > monthAgoInMs) {
      acc.closed[workItem.id] = closedOn.toISOString();
    }

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
    closed: {}, reducedIds: {}, types: {}, groups: {}, wiMeta: {}
  });

  return {
    byId: results.reducedIds,
    types: results.types,
    closed: results.closed,
    groups: results.groups,
    wiMeta: results.wiMeta
  };
};
