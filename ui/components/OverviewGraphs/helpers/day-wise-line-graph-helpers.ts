import { range } from 'rambda';
import type { UIWorkItem } from '../../../../shared/types';
import type { OrganizedWorkItems, WorkItemAccessors } from './helpers';

export type WorkItemPoint = {
  date: Date;
  workItems: UIWorkItem[];
};

export type WorkItemLine = {
  witId: string;
  groupName: string;
  workItemPoints: WorkItemPoint[];
};

export type MatchedDay = {
  date: Date;
  witId: string;
  groupName: string;
  workItems: UIWorkItem[];
};

export const getMatchingAtIndex = (
  data: WorkItemLine[],
  index: number
): MatchedDay[] => (
  data
    .map(line => ({
      witId: line.witId,
      groupName: line.groupName,
      date: line.workItemPoints[index].date,
      workItems: line.workItemPoints[index].workItems
    }))
    .filter(({ workItems }) => workItems.length > 0)
);

export const splitByDateForLineGraph = (
  accessors: WorkItemAccessors,
  organizedWorkItems: OrganizedWorkItems,
  filterWorkItems: (date: Date, accessors: WorkItemAccessors) => (workItem: UIWorkItem) => boolean
): WorkItemLine[] => {
  const separator = ':';
  const key = (witId: string, groupName: string) => `${witId}${separator}${groupName}`;

  const splitByDay = range(0, 30)
    .reduce<Record<string, { date: Date; workItems: UIWorkItem[] }[]>>((acc, day) => {
      const date = new Date(accessors.lastUpdated);
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      const filter = filterWorkItems(date, accessors);

      Object.entries(organizedWorkItems).forEach(([witId, groups]) => {
        Object.entries(groups).forEach(([groupName, workItems]) => {
          acc[key(witId, groupName)] = (acc[key(witId, groupName)] || [])
            .concat({
              date,
              workItems: workItems.filter(filter)
            });
        });
      });

      return acc;
    }, {});

  return Object.entries(splitByDay).map(([key, wi]) => {
    const [witId, ...rest] = key.split(separator);
    return {
      witId,
      groupName: rest.join(separator),
      workItemPoints: [...wi].reverse()
    };
  });
};

