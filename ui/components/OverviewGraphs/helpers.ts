import { always } from 'rambda';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { createPalette } from '../../helpers/utils';

export type GroupLabel = { witId: string; groupName: string };
export type OrganizedWorkItems = Record<string, Record<string, number[]>>;

export const lineColor = (() => {
  const c = createPalette([
    '#9A6324', '#e6194B', '#3cb44b', '#ffe119',
    '#000075', '#f58231', '#911eb4', '#42d4f4',
    '#bfef45', '#fabed4', '#a9a9a9'
  ]);

  return ({ witId, groupName }: GroupLabel) => (
    c(witId + groupName)
  );
})();

const groupCreator = (overview: Overview) => (
  (workItemId: number) => {
    const { groupId } = overview.byId[workItemId];
    return groupId ? overview.groups[groupId] : undefined;
  }
);

const witIdCreator = (overview: Overview) => (
  (workItemId: number) => overview.byId[workItemId].typeId
);

export const noGroup = 'no-group';

export const timeDifference = ({ start, end }: { start: string; end?: string }) => (
  new Date(end || new Date().toISOString()).getTime() - new Date(start).getTime()
);

export const cycleTimeFor = (overview: Overview) => (wid: number) => {
  const wi = overview.times[wid];
  if (!wi.start || !wi.end) return undefined;

  return new Date(wi.end).getTime() - new Date(wi.start).getTime();
};

export const totalCycleTimeUsing = (cycleTime: (workItemId: number) => number | undefined) => (
  (workItemIds: number[]) => (
    workItemIds.reduce((acc, wid) => acc + (cycleTime(wid) || 0), 0)
  )
);

export const workCenterTimeUsing = (workItemTimes: (wid: number) => Overview['times'][number]) => (wid: number) => (
  // If a wc doesn't have an end date, we should disregard it
  workItemTimes(wid).workCenters.reduce((a, wc) => a + (wc.end ? timeDifference(wc) : 0), 0)
);

export const totalWorkCenterTimeUsing = (workItemTimes: (wid: number) => Overview['times'][number]) => {
  const workCenterTime = workCenterTimeUsing(workItemTimes);
  return (
    (wids: number[]) => wids.reduce(
      (acc: number, wid: number) => acc + workCenterTime(wid),
      0
    )
  );
};

export const groupLabelUsing = (workItemType: (witId: string) => UIWorkItemType) => (
  ({ witId, groupName }: GroupLabel) => (
    workItemType(witId).name[1] + (groupName === noGroup ? '' : ` - ${groupName}`)
  )
);

export const isWorkItemClosed = (workItemTimes: Overview['times'][number]) => {
  if (!workItemTimes.end) return false;
  // The following should not be needed. However, it clearly is. :D

  // Sometimes, due to incorrect custom field values in Azure, we don't have a
  // start date. We ignore such cases.
  if (!workItemTimes.start) return false;

  // On the server, we're querying by state changed date. However, the last
  // state change date might not be the end date, depending on config.json.
  // So, we need to filter out items that have an end date older than the last month.
  const queryPeriod = new Date();
  queryPeriod.setDate(queryPeriod.getDate() - 30);
  queryPeriod.setHours(0, 0, 0, 0);
  return new Date(workItemTimes.end) > queryPeriod;
};

const getWorkItemIdsUsingTimes = (pred: (workItemTimes: Overview['times'][number]) => boolean) => (
  (overview: Overview) => (
    Object.entries(overview.times)
      .filter(([, times]) => pred(times))
      .map(([id]) => Number(id))
  )
);

const organizeWorkItems = (workItemIds: (overview: Overview) => number[]) => (
  (
    overview: Overview,
    workItemById: (wid: number) => UIWorkItem,
    selectedFilters: { label: string; tags: string[] }[]
  ) => {
    const witId = witIdCreator(overview);
    const group = groupCreator(overview);

    const filtersToApply = selectedFilters.filter(f => f.tags.length);

    return workItemIds(overview)
      .reduce<OrganizedWorkItems>(
        (acc, workItemId) => {
          if (filtersToApply.length) {
            const workItem = workItemById(workItemId);
            const matchesFilter = filtersToApply.every(filter => {
              const matchingFilter = workItem.filterBy?.find(f => f.label === filter.label);
              if (!matchingFilter) return false;

              return filter.tags.some(tag => matchingFilter.tags.includes(tag));
            });
            if (!matchesFilter) return acc;
          }
          const groupName = group(workItemId)?.name ?? noGroup;
          const typeId = witId(workItemId);

          acc[typeId] = acc[typeId] || {};
          acc[typeId][groupName] = (acc[typeId][groupName] || []).concat(workItemId);

          return acc;
        }, {}
      );
  }
);

const closedWorkItemIds = getWorkItemIdsUsingTimes(isWorkItemClosed);
const workItemIdsFull = getWorkItemIdsUsingTimes(always(true));

export const organizedClosedWorkItems = organizeWorkItems(closedWorkItemIds);
export const organizedAllWorkItems = organizeWorkItems(workItemIdsFull);

export const allWorkItemIdsFromOrganizedGroup = (organizedGroups: OrganizedWorkItems) => (
  Object.values(organizedGroups)
    .reduce<number[]>((acc, group) => acc.concat(...Object.values(group)), [])
);

export const groupByWorkItemType = (organizedGroups: OrganizedWorkItems) => (
  Object.entries(organizedGroups).reduce<Record<string, number[]>>((acc, [witId, group]) => {
    acc[witId] = (acc[witId] || []).concat(...Object.values(group));
    return acc;
  }, {})
);

export const collectFilters = (workItems: UIWorkItem[]) => (
  Object.entries(
    workItems.reduce<Record<string, Set<string>>>((acc, workItem) => {
      if (!workItem.filterBy) return acc;

      workItem.filterBy.forEach(filter => {
        acc[filter.label] = acc[filter.label] || new Set();
        filter.tags.forEach(tag => acc[filter.label].add(tag));
      });

      return acc;
    }, {})
  ).map(([label, tags]) => ({ label, tags: [...tags].sort() }))
);

export const hasWorkItems = (organizedWorkItems: OrganizedWorkItems) => (
  Object.values(organizedWorkItems).some(group => (
    Object.values(group).some(workItemIds => workItemIds.length)
  ))
);
