import type { ReactNode } from 'react';
import { useState } from 'react';
import { last, T } from 'rambda';
import type {
  ProjectOverviewAnalysis, UIWorkItem, UIWorkItemType, WorkItemTimes
} from '../../../../shared/types.js';
import { createPalette } from '../../../helpers/utils.js';
import type { LegendSidebarProps } from './LegendSidebar.js';
import {
  cycleTime, isNewInTimeRange, isWIPInTimeRange, totalCycleTime, totalWorkCenterTime, workCenterTime
} from '../../../../shared/work-item-utils.js';

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

const queryPeriodStart = (lastUpdated: string, queryPeriodDays: number) => {
  const queryPeriod = new Date(lastUpdated);
  queryPeriod.setDate(queryPeriod.getDate() - queryPeriodDays);
  queryPeriod.setHours(0, 0, 0, 0);
  return queryPeriod;
};

export const timeSpent = (workItemType: UIWorkItemType) => (times: WorkItemTimes) => (
  times.start
    ? workItemType.workCenters.reduce<TimeInArea[]>((acc, wc, index) => {
      const matchingTime = times.workCenters.find(c => c.label === wc.label);

      if (!matchingTime) return acc;

      acc.push({
        label: `Waiting for ${wc.label}`,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        start: index === 0 ? new Date(times.start!) : acc[acc.length - 1].end!,
        end: new Date(matchingTime.start),
        isWorkCenter: false
      }, {
        label: `In ${wc.label}`,
        start: new Date(matchingTime.start),
        end: matchingTime.end ? new Date(matchingTime.end) : undefined,
        isWorkCenter: true
      });

      if (index === workItemType.workCenters.length - 1 && matchingTime.end) {
        acc.push({
          label: `After ${wc.label}`,
          start: new Date(matchingTime.end),
          end: times.end ? new Date(times.end) : undefined,
          isWorkCenter: false
        });
      }

      return acc;
    }, []).slice(1)
    : []
);

export const workItemAccessors = (projectAnalysis: ProjectOverviewAnalysis, queryPeriodDays: number) => {
  const {
    overview, lastUpdated, ignoreForWIP, environments
  } = projectAnalysis;

  const workItemTimes = (wi: UIWorkItem) => overview.times[wi.id];

  const workItemGroup = (groupId: string) => overview.groups[groupId];
  const workItemType = (wit: string) => overview.types[wit];

  const isBug = (witId: string) => workItemType(witId).name[0].toLowerCase().includes('bug');

  const startOfQueryPeriod = queryPeriodStart(lastUpdated, queryPeriodDays);

  const isWIPIn = isWIPInTimeRange(workItemTimes, ignoreForWIP);

  return {
    queryPeriodDays,
    allWorkItems: Object.values(overview.byId),
    lastUpdated: new Date(lastUpdated),
    ignoreForWIP,
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
    timeSpent: (wi: UIWorkItem) => timeSpent(workItemType(wi.typeId))(workItemTimes(wi)),
    environments,
    sortByEnvironment: ((environments?: string[]) => {
      const envs = environments?.map(e => e.toLowerCase());
      return (a: string, b: string) => {
        if (!envs) { return 0; }
        return envs.indexOf(a.toLowerCase()) - envs.indexOf(b.toLowerCase());
      };
    })(environments),
    isWorkItemClosed: (wi: UIWorkItem) => {
      const wiTimes = workItemTimes(wi);
      if (!wiTimes.end) return false;

      // The following should not be needed. However, it clearly is. :D
      // Sometimes, due to incorrect custom field values in Azure, we don't have a
      // start date. We ignore such cases.
      if (!wiTimes.start) return false;

      // On the server, we're querying by state changed date. However, the last
      // state change date might not be the end date, depending on config.json.
      // So, we need to filter out items that have an end date older than
      // the last three months.
      return new Date(wiTimes.end) > startOfQueryPeriod;
    },
    wasWorkItemOpenedInLastThreeMonths: isNewInTimeRange(workItemType, workItemTimes)(
      d => d > startOfQueryPeriod
    ),
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
  { workItemType, sortByEnvironment }: WorkItemAccessors,
  aggregator: (workItems: UIWorkItem[], witId: string, groupName: string) => ReactNode,
  isChecked?: (key: string) => boolean,
  color = lineColor
) => (
  Object.entries(organizedWorkIItems)
    .reduce<LegendSidebarProps['items']>((acc, [witId, groups]) => {
      Object.entries(groups)
        .sort(([a], [b]) => sortByEnvironment(a, b))
        .forEach(([groupName, workItems]) => {
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
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];

  const l = [...list];
  const last = l.pop();
  return `${`${l.join(', ')} ${joiner}`} ${last}`;
};

export const stringifyDateField = (fields: string[]) => (
  fields.length === 1 ? `'${fields[0]}'` : `${listFormat(fields.map(f => `'${f}'`), 'or')}, whichever is earlier`
);

export const workItemStateUsing = (
  { workItemTimes }: WorkItemAccessors,
  wit: UIWorkItemType
) => (
  (workItem: UIWorkItem) => {
    const times = workItemTimes(workItem);

    if (times.end) {
      // It's closed
      return {
        state: 'Done',
        since: new Date(times.end)
      };
    }

    const lastState = last(times.workCenters);

    if (!lastState) {
      // Not entered first work center yet
      return {
        state: `Before ${wit.workCenters.length ? wit.workCenters[0].label : 'start'}`,
        since: new Date(times.start || workItem.created.on)
      };
    }

    if (lastState.end) {
      // Completed the last state
      // This either means it's done with all work centers, or it's in a waiting state

      const stateIndex = wit.workCenters.findIndex(wc => wc.label === lastState.label);
      if (stateIndex === wit.workCenters.length - 1) {
        // It's done with workcenters
        return {
          state: `After ${lastState.label}`,
          since: new Date(lastState.end)
        };
      }

      // It's in a waiting state
      return {
        state: `Waiting for ${wit.workCenters[stateIndex + 1].label}`,
        since: new Date(lastState.end)
      };
    }

    // It's in a working state
    return {
      state: `In ${lastState.label}`,
      since: new Date(lastState.start)
    };
  }
);

export type TimeInArea = {
  label: string;
  start: Date;
  end?: Date;
  isWorkCenter: boolean;
};
