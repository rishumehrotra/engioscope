import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { exists } from '../../utils';
import type { ParsedCollection } from '../parse-config';
import type { WorkItem, WorkItemType } from '../types-azure';

const getStartdate = (workItem: WorkItem, workItemConfig: NonNullable<ParsedCollection['workitems']['types']>[number]) => {
  const startDates = workItemConfig.startDate.map(
    startDateField => (workItem.fields[startDateField] ? new Date(workItem.fields[startDateField]) : null)
  ).filter(exists);

  return new Date(Math.max(...startDates.map(d => d.getTime())));
};

const getEndDate = (workItem: WorkItem, workItemConfig: NonNullable<ParsedCollection['workitems']['types']>[number]) => {
  const endDates = workItemConfig.endDate.map(
    endDateField => (workItem.fields[endDateField] ? new Date(workItem.fields[endDateField]) : null)
  ).filter(exists);

  if (!endDates.length) return undefined;

  return new Date(Math.min(...endDates.map(d => d.getTime())));
};

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
      start: getStartdate(workItem, workItemConfig).toISOString(),
      end: getEndDate(workItem, workItemConfig)?.toISOString(),
      workCenters: workItemConfig.workCenters.map(wc => {
        const hasStartDateField = wc.startDate.some(f => f in workItem.fields);
        const hasEndDateField = wc.endDate.some(f => f in workItem.fields);
        if (!hasStartDateField || !hasEndDateField) return;

        const minStartDate = wc.startDate.reduce((acc, field) => {
          const startDate = new Date(workItem.fields[field]);
          return startDate < acc ? startDate : acc;
        }, new Date(0));

        const minEndDate = wc.endDate.reduce((acc, field) => {
          const endDate = new Date(workItem.fields[field]);
          return endDate < acc ? endDate : acc;
        }, new Date(0));

        return {
          label: wc.label,
          time: (
            new Date(minEndDate).getTime()
            - new Date(minStartDate).getTime()
          )
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
    reducedIds: {}, types: {}, groups: {}, wiMeta: {}
  });

  return {
    byId: results.reducedIds,
    types: results.types,
    groups: results.groups,
    wiMeta: results.wiMeta
  };
};
