import type { Overview } from '../../../shared/types';

export const workItemAccessors = (overview: Overview) => ({
  workItemType: (witId: string) => overview.types[witId],
  workItemById: (wid: number) => overview.byId[wid],
  workItemTimes: (wid: number) => overview.times[wid],
  workItemGroup: (wid: number) => {
    const { groupId } = overview.byId[wid];
    return groupId ? overview.groups[groupId] : null;
  }
});

export type WorkItemAccessors = ReturnType<typeof workItemAccessors>;
