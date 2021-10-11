import { range } from 'rambda';
import type { Overview, ProjectOverviewAnalysis } from '../../../shared/types';
import type { OrganizedWorkItems } from './helpers';

export type WorkItemPoint = {
  date: Date;
  workItemIds: number[];
};

export type WorkItemLine = {
  witId: string;
  groupName: string;
  workItems: WorkItemPoint[];
};

export type MatchedDay = {
  date: Date;
  witId: string;
  groupName: string;
  workItemIds: number[];
};

export const getMatchingAtIndex = (
  data: WorkItemLine[],
  index: number
): MatchedDay[] => (
  data
    .map(line => ({
      witId: line.witId,
      groupName: line.groupName,
      date: line.workItems[index].date,
      workItemIds: line.workItems[index].workItemIds
    }))
    .filter(({ workItemIds }) => workItemIds.length > 0)
);

export const splitByDateForLineGraph = (
  projectAnalysis: ProjectOverviewAnalysis,
  organizedWorkItems: OrganizedWorkItems,
  filterWorkItems: (workItemId: number, date: Date, overview: Overview) => boolean
): WorkItemLine[] => {
  const { lastUpdated } = projectAnalysis;
  const separator = ':';
  const key = (witId: string, groupName: string) => `${witId}${separator}${groupName}`;

  const splitByDay = range(0, 30)
    .reduce<Record<string, { date: Date; workItemIds: number[] }[]>>((acc, day) => {
      const date = new Date(lastUpdated);
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      Object.entries(organizedWorkItems).forEach(([witId, groups]) => {
        Object.entries(groups).forEach(([groupName, workItemIds]) => {
          acc[key(witId, groupName)] = (acc[key(witId, groupName)] || [])
            .concat({
              date,
              workItemIds: workItemIds.filter(
                wid => filterWorkItems(wid, date, projectAnalysis.overview)
              )
            });
        });
      });

      return acc;
    }, {});

  return Object.entries(splitByDay).map(([key, wids]) => {
    const [witId, ...rest] = key.split(separator);
    return {
      witId,
      groupName: rest.join(separator),
      workItems: [...wids].reverse()
    };
  });
};

