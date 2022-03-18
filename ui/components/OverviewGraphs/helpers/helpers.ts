import { useState } from 'react';
import { T } from 'rambda';
import type { ProjectOverviewAnalysis, UIWorkItem } from '../../../../shared/types';
import { createPalette } from '../../../helpers/utils';
import type { LegendSidebarProps } from './LegendSidebar';
import {
  cycleTime, isWIPInTimeRange, totalCycleTime, totalWorkCenterTime, workCenterTime
} from '../../../../shared/work-item-utils';

export type GroupLabel = { witId: string; groupName: string };
export type OrganizedWorkItems = Record<string, Record<string, UIWorkItem[]>>;

export const noGroup = 'Not classified';

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

export const workItemAccessors = (projectAnalysis: ProjectOverviewAnalysis) => {
  const { overview } = projectAnalysis;

  const workItemTimes = (wi: UIWorkItem) => overview.times[wi.id];

  const workItemGroup = (groupId: string) => overview.groups[groupId];
  const workItemType = (wit: string) => overview.types[wit];

  const isBug = (witId: string) => workItemType(witId).name[0].toLowerCase().includes('bug');

  const startOfQueryPeriod = oneMonthAgo(projectAnalysis.lastUpdated);

  const isWIPIn = isWIPInTimeRange(workItemTimes, projectAnalysis.ignoreForWIP);

  return {
    allWorkItems: Object.values(overview.byId),
    lastUpdated: new Date(projectAnalysis.lastUpdated),
    ignoreForWIP: projectAnalysis.ignoreForWIP,
    workItemType,
    workItemTimes,
    workItemGroup,
    cycleTime: cycleTime(workItemTimes),
    isBug,
    totalCycleTime: totalCycleTime(workItemTimes),
    workCenterTime: workCenterTime(workItemTimes),
    totalWorkCenterTime: totalWorkCenterTime(workItemTimes),
    isWIPInTimeRange: isWIPIn,
    isWIP: isWIPIn(T),
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
    wasWorkItemOpenedThisMonth: (wi: UIWorkItem) => {
      if (isBug(wi.typeId)) return new Date(wi.created.on) > startOfQueryPeriod;

      const wiTimes = workItemTimes(wi);
      if (!wiTimes.start) return false;

      return new Date(wiTimes.start) > startOfQueryPeriod;
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
    ),
    workItemRelations: (wi: UIWorkItem) => overview.relations?.[wi.id] || []
  };
};

export type WorkItemAccessors = ReturnType<typeof workItemAccessors>;

export const getSidebarHeadlineStats = (
  organizedWorkItems: OrganizedWorkItems,
  workItemType: WorkItemAccessors['workItemType'],
  aggregator: (workItems: UIWorkItem[], witId: string) => string,
  unit: string
) => (
  Object.entries(organizedWorkItems)
    .map(([witId, groups]) => ({
      label: workItemType(witId).name[1],
      value: aggregator(Object.values(groups).flat(), witId),
      unit
    }))
);

export const getSidebarItemStats = (
  organizedWorkIItems: OrganizedWorkItems,
  workItemType: WorkItemAccessors['workItemType'],
  aggregator: (workItems: UIWorkItem[], witId: string, groupName: string) => string,
  isChecked?: (key: string) => boolean,
  color = lineColor
) => (
  Object.entries(organizedWorkIItems)
    .reduce<LegendSidebarProps['items']>((acc, [witId, groups]) => {
      Object.entries(groups).forEach(([groupName, workItems]) => {
        const wit = workItemType(witId);
        const label = groupName === noGroup ? wit.name[1] : groupName;
        acc.push({
          label,
          value: aggregator(workItems, witId, groupName),
          iconUrl: wit.icon,
          key: witId + groupName,
          color: color({ witId, groupName }),
          isChecked: isChecked?.(witId + groupName)
        });
      });
      return acc;
    }, [])
);

export const useSidebarCheckboxState = (organizedAllWorkItems: OrganizedWorkItems) => {
  const [checked, setChecked] = useState(
    Object.entries(organizedAllWorkItems).reduce<Record<string, boolean>>((acc, [witId, groups]) => {
      Object.keys(groups).forEach(groupName => {
        acc[witId + groupName] = true;
      });
      return acc;
    }, {})
  );

  const toggleChecked = (key: string) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getChecked = (key: string) => checked[key];

  return [toggleChecked, getChecked] as const;
};

export const getSidebarStatByKey = (key: string, organizedWorkItems: OrganizedWorkItems) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [matchingWitId, groups] = Object.entries(organizedWorkItems)
    .find(([witId]) => key.startsWith(witId))!;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [matchingGroup, workItems] = Object.entries(groups)
    .find(([groupName]) => key === matchingWitId + groupName)!;

  return [matchingWitId, matchingGroup, workItems] as const;
};

export const listFormat = (list: string[], joiner = 'and') => {
  if (list.length === 1) return list[0];

  const l = [...list];
  const last = l.pop();
  return `${`${l.join(', ')} ${joiner}`} ${last}`;
};

export const stringifyDateField = (fields: string[]) => (
  fields.length === 1 ? `'${fields[0]}'` : `${listFormat(fields.map(f => `'${f}'`), 'or')}, whichever is earlier`
);
