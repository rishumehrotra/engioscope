import {
  add, map, pipe, reduce, sum
} from 'rambda';
import type { Overview, UIWorkItem } from '../../shared/types';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import type { ProjectAnalysis } from './types';

const monthAgo = (() => {
  const now = Date.now();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  return monthAgo;
})();

const isWithinLastMonth = (date: Date) => date > monthAgo;

const average = (nums: number[]) => (
  nums.length === 0 ? 0 : Math.round(sum(nums) / nums.length)
);

const timeDiff = (end: string | undefined, start: string | undefined) => (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  new Date(end!).getTime() - new Date(start!).getTime()
);

type Group = NonNullable<ParsedConfig['azure']['summaryPageGroups']>[number];
type Result = {
  collectionConfig: ParsedCollection;
  projectConfig: ParsedProjectConfig;
  analysisResult: ProjectAnalysis;
};

const matchingResult = (group: Group, results: Result[]) => (
  results.find(result => (
    result.collectionConfig.name === group.collection
      && result.projectConfig.name === group.project
  ))
);

const groupType = (group: Group): [string, string] | 'project' => {
  const remainingKey = Object.entries(group)
    .filter(([key]) => key !== 'collection' && key !== 'project')[0];

  return remainingKey || 'project';
};

const groupName = (group: Group) => {
  const g = groupType(group);
  return g === 'project' ? group.project : g[1];
};

const workItemsForGroup = (group: Group, result: Result) => {
  const { overview } = result.analysisResult.workItemAnalysis;
  const g = groupType(group);

  if (g === 'project') return Object.values(overview.byId);

  return Object.values(overview.byId)
    .filter(workItem => (
      workItem.filterBy?.some(
        filter => filter.label === g[0] && filter.tags.includes(g[1])
      )
    ));
};

const workItemTimes = (result: Result) => {
  const { overview } = result.analysisResult.workItemAnalysis;
  return (workItem: UIWorkItem) => overview.times[workItem.id];
};

const hasWorkItemCompleted = (result: Result) => {
  const times = workItemTimes(result);

  return (workItem: UIWorkItem) => {
    const { end } = times(workItem);
    return end && isWithinLastMonth(new Date(end));
  };
};

const completedWorkItems = (group: Group, result: Result) => (
  workItemsForGroup(group, result)
    .filter(hasWorkItemCompleted(result))
);

// const isWorkItemWIP = (result: Result) => compose(not, hasWorkItemCompleted(result));

// #region work item type utilities

const groupByWorkItemType = (workItems: UIWorkItem[]) => (
  workItems
    .reduce<Record<string, UIWorkItem[]>>((acc, workItem) => {
      acc[workItem.typeId] = [
        ...(acc[workItem.typeId] || []),
        workItem
      ];
      return acc;
    }, {})
);

const processItemsInGroup = <T, U>(transformList: (items: U[]) => T) => (
  (workItemGroups: Record<string, U[]>) => (
    Object.fromEntries(
      Object.entries(workItemGroups)
        .map(([typeId, workItems]) => ([typeId, transformList(workItems)]))
    )
  )
);

const mapWorkItemGroups = <T>(mapFn: (wi: UIWorkItem) => T) => (
  processItemsInGroup(map(mapFn))
);

const reduceGroups = <T, U>(reducer: (acc: T, i: U) => T, initial: T) => (
  processItemsInGroup(reduce<U, T>(reducer, initial))
);

const averageGroup = processItemsInGroup(average);

// #endregion

const velocity = pipe(
  groupByWorkItemType,
  reduceGroups(add(1), 0)
);

const cycleTime = (workItemTimes: (w: UIWorkItem) => Overview['times'][number]) => pipe(
  groupByWorkItemType,
  mapWorkItemGroups(workItem => {
    const { end, start } = workItemTimes(workItem);
    return timeDiff(end, start);
  }),
  averageGroup
);

const changeLeadTime = (workItemTimes: (w: UIWorkItem) => Overview['times'][number]) => pipe(
  groupByWorkItemType,
  mapWorkItemGroups(workItem => {
    const { end, devComplete } = workItemTimes(workItem);
    return timeDiff(end, devComplete);
  }),
  averageGroup
);

export default (config: ParsedConfig, results: Result[]) => {
  const { summaryPageGroups } = config.azure;
  if (!summaryPageGroups) return [];

  return summaryPageGroups.map(group => {
    const match = matchingResult(group, results);

    if (!match) return null;

    const completedWis = completedWorkItems(group, match);
    const wiTimes = workItemTimes(match);

    return {
      ...group,
      groupName: groupName(group),
      velocity: velocity(completedWis),
      cycleTime: cycleTime(wiTimes)(completedWis),
      changeLeadTime: changeLeadTime(wiTimes)(completedWis),
      workItemTypes: match.analysisResult.workItemAnalysis.overview.types
    };
  });
};
