import type { ProjectOverviewAnalysis, UIWorkItem } from '../../../shared/types';
import { createPalette } from '../../helpers/utils';
import type { LegendSidebarProps } from './LegendSidebar';

export type GroupLabel = { witId: string; groupName: string };
export type OrganizedWorkItems = Record<string, Record<string, UIWorkItem[]>>;

export const noGroup = 'no-group';

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

const oneMonthAgo = (lastUpdated: string) => {
  const queryPeriod = new Date(lastUpdated);
  queryPeriod.setDate(queryPeriod.getDate() - 30);
  queryPeriod.setHours(0, 0, 0, 0);
  return queryPeriod;
};
export const timeDifference = ({ start, end }: { start: string; end?: string }) => (
  (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()
);

export const workItemAccessors = (projectAnalysis: ProjectOverviewAnalysis) => {
  const { overview } = projectAnalysis;

  const workItemTimes = (wi: UIWorkItem) => overview.times[wi.id];

  const cycleTime = (wi: UIWorkItem) => {
    const wit = overview.times[wi.id];
    if (!wit.start || !wit.end) return;

    return new Date(wit.end).getTime() - new Date(wit.start).getTime();
  };

  const workItemGroup = (groupId: string) => overview.groups[groupId];
  const workItemType = (wit: string) => overview.types[wit];

  const allWorkItems = Object.values(overview.byId);

  const startOfQueryPeriod = oneMonthAgo(projectAnalysis.lastUpdated);

  return {
    allWorkItems,
    lastUpdated: new Date(projectAnalysis.lastUpdated),
    workItemType,
    workItemTimes,
    workItemGroup,
    cycleTime,
    totalCycleTime: (workItems: UIWorkItem[]) => (
      workItems.reduce((acc, wi) => acc + (cycleTime(wi) || 0), 0)
    ),
    workCenterTime: (wi: UIWorkItem) => (
      // If a wc doesn't have an end date, we should disregard it
      workItemTimes(wi).workCenters.reduce((a, wc) => a + (wc.end ? timeDifference(wc) : 0), 0)
    ),
    isWorkItemClosed: (wi: UIWorkItem) => {
      const wiTimes = workItemTimes(wi);
      if (!wiTimes.end) return false;

      // The following should not be needed. However, it clearly is. :D
      // Sometimes, due to incorrect custom field values in Azure, we don't have a
      // start date. We ignore such cases.
      if (!wiTimes.start) return false;

      // On the server, we're querying by state changed date. However, the last
      // state change date might not be the end date, depending on config.json.
      // So, we need to filter out items that have an end date older than the last month.
      return new Date(wiTimes.end) > startOfQueryPeriod;
    },
    organizeByWorkItemType: (workItems: UIWorkItem[], filter: (wi: UIWorkItem) => boolean) => (
      workItems.reduce<OrganizedWorkItems>((acc, wi) => {
        acc[wi.typeId] = acc[wi.typeId] || {};
        const group = wi.groupId ? workItemGroup(wi.groupId) : null;
        const groupName = group ? group.name : noGroup;
        acc[wi.typeId][groupName] = acc[wi.typeId][groupName] || [];
        if (filter(wi)) acc[wi.typeId][groupName].push(wi);
        return acc;
      }, {})
    ),
    groupLabel: ({ witId, groupName }: GroupLabel) => (
      workItemType(witId).name[1] + (groupName === noGroup ? '' : ` - ${groupName}`)
    )

  };
};

export type WorkItemAccessors = ReturnType<typeof workItemAccessors>;

export const getSidebarHeadlineStats = (
  organizedWorkIItems: OrganizedWorkItems,
  workItemType: WorkItemAccessors['workItemType'],
  aggregator: (workItems: UIWorkItem[]) => string,
  unit: string
) => (
  Object.entries(organizedWorkIItems)
    .map(([typeId, groups]) => ({
      label: workItemType(typeId).name[1],
      value: aggregator(Object.values(groups).flat()),
      unit
    }))
);

export const getSidebarItemStats = (
  organizedWorkIItems: OrganizedWorkItems,
  workItemType: WorkItemAccessors['workItemType'],
  aggregator: (workItems: UIWorkItem[]) => string,
  color = lineColor,
  isChecked?: (key: string) => boolean
) => (
  Object.entries(organizedWorkIItems)
    .reduce<LegendSidebarProps['items']>((acc, [witId, groups]) => {
      Object.entries(groups).forEach(([groupName, workItems]) => {
        const wit = workItemType(witId);
        const label = groupName === noGroup ? wit.name[1] : groupName;
        acc.push({
          label,
          value: aggregator(workItems),
          iconUrl: wit.icon,
          key: witId + groupName,
          color: color({ witId, groupName }),
          isChecked: isChecked?.(witId + groupName)
        });
      });
      return acc;
    }, [])
);

export const getSidebarStatByKey = (key: string, organizedWorkIItems: OrganizedWorkItems) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [matchingWitId, groups] = Object.entries(organizedWorkIItems)
    .find(([witId]) => key.startsWith(witId))!;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [matchingGroup, workItems] = Object.entries(groups)
    .find(([groupName]) => key.endsWith(groupName))!;

  return [matchingWitId, matchingGroup, workItems] as const;
};
