import { always } from 'rambda';
import type { Overview } from '../../../shared/types';
import { createPalette } from '../../helpers/utils';

export type GroupLabel = { witId: string; groupName: string };
export type OrganizedWorkItems = Record<string, Record<string, number[]>>;

export const lineColor = (() => {
  const c = createPalette([
    '#b3b300', '#ffa500', '#ff0000', '#ff00ff',
    '#a862ea', '#134e6f', '#4d4dff', '#9999ff',
    '#00b300', '#b30000'
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

export const cycleTimeFor = (overview: Overview) => (wid: number) => {
  const wi = overview.wiMeta[wid];
  if (!wi.start || !wi.end) return undefined;

  return new Date(wi.end).getTime() - new Date(wi.start).getTime();
};

export const isWorkItemClosed = (workItemMeta: Overview['wiMeta'][number]) => (
  Boolean(workItemMeta.end) && Boolean(workItemMeta.start)
);

const getWorkItemIdsUsingMeta = (pred: (workItemMeta: Overview['wiMeta'][number]) => boolean) => (
  (overview: Overview) => (
    Object.entries(overview.wiMeta)
      .filter(([, meta]) => pred(meta))
      .map(([id]) => Number(id))
  )
);

const organizeWorkItems = (workItemIds: (overview: Overview) => number[]) => (
  (overview: Overview) => {
    const witId = witIdCreator(overview);
    const group = groupCreator(overview);

    return workItemIds(overview)
      .reduce<Record<string, Record<string, number[]>>>(
        (acc, workItemId) => {
          const groupName = group(workItemId)?.name ?? noGroup;
          const typeId = witId(workItemId);

          acc[typeId] = acc[typeId] || {};
          acc[typeId][groupName] = (acc[typeId][groupName] || []).concat(workItemId);

          return acc;
        }, {}
      );
  }
);

const closedWorkItemIds = getWorkItemIdsUsingMeta(isWorkItemClosed);
const workItemIdsFull = getWorkItemIdsUsingMeta(always(true));

export const organizedClosedWorkItems = organizeWorkItems(closedWorkItemIds);
export const organizedAllWorkItems = organizeWorkItems(workItemIdsFull);
