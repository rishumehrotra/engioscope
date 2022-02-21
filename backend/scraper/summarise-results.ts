import type { UIWorkItem } from '../../shared/types';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import type { ProjectAnalysis } from './types';

const monthAgo = (() => {
  const now = Date.now();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  return monthAgo;
})();

const isWithinLastMonth = (date: Date) => date > monthAgo;

const average = (nums: number[]) => (
  nums.length === 0
    ? 0
    : nums.reduce((acc, num) => acc + num, 0) / nums.length
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

const velocity = (group: Group, result: Result) => (
  workItemsForGroup(group, result)
    .filter(hasWorkItemCompleted(result))
    .reduce<Record<string, number>>((acc, workItem) => {
      acc[workItem.typeId] = (acc[workItem.typeId] || 0) + 1;
      return acc;
    }, {})
);

const cycleTime = (group: Group, result: Result) => (
  Object.fromEntries(
    Object.entries(
      workItemsForGroup(group, result)
        .filter(hasWorkItemCompleted(result))
        .reduce<Record<string, number[]>>((acc, workItem) => {
          const { end, start } = workItemTimes(result)(workItem);
          acc[workItem.typeId] = [
            ...(acc[workItem.typeId] || []),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            new Date(end!).getTime() - new Date(start!).getTime()
          ];
          return acc;
        }, {})
    )
      .map(([typeId, times]) => ([
        typeId,
        Math.round(average(times))
      ]))
  )
);

const changeLeadTime = (group: Group, result: Result) => (
  Object.fromEntries(
    Object.entries(
      workItemsForGroup(group, result)
        .filter(hasWorkItemCompleted(result))
        .reduce<Record<string, number[]>>((acc, workItem) => {
          const { end, devComplete } = workItemTimes(result)(workItem);
          acc[workItem.typeId] = [
            ...(acc[workItem.typeId] || []),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            new Date(end!).getTime() - new Date(devComplete!).getTime()
          ];
          return acc;
        }, {})
    )
      .map(([typeId, times]) => ([
        typeId,
        Math.round(average(times))
      ]))
  )
);

export default (config: ParsedConfig, results: Result[]) => {
  const { summaryPageGroups } = config.azure;
  if (!summaryPageGroups) return [];

  return summaryPageGroups.map(group => {
    const match = matchingResult(group, results);

    if (!match) return null;

    return {
      ...group,
      groupName: groupName(group),
      velocity: velocity(group, match),
      cycleTime: cycleTime(group, match),
      changeLeadTime: changeLeadTime(group, match),
      workItemTypes: match.analysisResult.workItemAnalysis.overview.types
    };
  });
};
