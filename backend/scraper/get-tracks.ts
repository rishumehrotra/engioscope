import {
  applySpec, filter, length, map, mergeLeft, pipe, prop
} from 'rambda';
import type {
  TrackwiseData, UIWorkItemType, WorkItemTimes, Overview, UIWorkItem, TrackMetrics
} from '../../shared/types.js';
import { mapObj } from '../../shared/utils.js';
import type { WorkItemTimesGetter } from '../../shared/work-item-utils.js';
import {
  isWIP, isWIPInTimeRange, flowEfficiency, timeDifference
} from '../../shared/work-item-utils.js';
import {
  isAfter, queryPeriodDays, weekLimits, weeks
} from '../utils.js';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config.js';
import type { ProjectAnalysis } from './types.js';

type Result = {
  collectionConfig: ParsedCollection;
  projectConfig: ParsedProjectConfig;
  analysisResult: ProjectAnalysis;
};

const overview = (result: Result) => result.analysisResult.workItemAnalysis.overview;
const mergeProp = (results: Result[]) => <T extends keyof Overview>(propName: T): Overview[T] => (
  results
    .map(overview)
    .map(prop(propName))
    .reduce(mergeLeft, {})
);

const hasWorkItemCompleted = (workItemTimes: WorkItemTimesGetter) => (
  (isMatchingDate: (d: Date) => boolean) => (
    (workItem: UIWorkItem) => {
      const { start, end } = workItemTimes(workItem);
      return Boolean(start && end && isMatchingDate(new Date(end)));
    }
  )
);

const computeTimeDifference = (workItemTimes: WorkItemTimesGetter) => (
  (start: keyof Omit<Overview['times'][number], 'workCenters'>, end?: keyof Omit<Overview['times'][number], 'workCenters'>) => (
    (workItem: UIWorkItem) => {
      const wits = workItemTimes(workItem);
      const { [start]: startTime } = wits;
      const endTime = end ? wits[end] : undefined;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return timeDifference({ start: startTime!, end: endTime });
    }
  )
);

export const isNewIn = (isWithinTimeRange: (d: Date) => boolean) => (
  (wi: UIWorkItem) => isWithinTimeRange(new Date(wi.created.on))
);

export const organiseWorkItemsByTracks = (wis: UIWorkItem[]) => (
  wis.reduce<Record<string, UIWorkItem[]>>((acc, wi) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const trackName = wi.track!;
    acc[trackName] = acc[trackName] || [];
    acc[trackName].push(wi);
    return acc;
  }, {})
);

const trackMetrics = (config: ParsedConfig, results: Result[]) => {
  const resultsBy = mergeProp(results);
  const times = resultsBy('times');
  const workItemsWithTracks = Object.values(resultsBy('byId')).filter(prop('track'));
  const isInQueryPeriod = isAfter(`${queryPeriodDays(config)} days`);

  const workItemTimes = (wi: UIWorkItem) => times[wi.id];
  const computeTimeDifferenceBetween = computeTimeDifference(workItemTimes);
  const wasWorkItemCompletedIn = hasWorkItemCompleted(workItemTimes);
  const wasWorkItemCompletedInQueryPeriod = wasWorkItemCompletedIn(isInQueryPeriod);

  // FIXME: This is obviously wrong. Use results.projectConfig instead
  const ignoreList = config.azure.collections.flatMap(c => c.projects.flatMap(p => p.workitems.ignoreForWIP || []));

  const isWIPIn = ([, weekEnd]: readonly [Date, Date]) => (
    isWIPInTimeRange(workItemTimes, ignoreList)((d, type) => {
      if (type === 'start') return d <= weekEnd;
      return d < weekEnd;
    })
  );

  const wipWorkItems = isWIP(workItemTimes, ignoreList);

  return pipe(
    organiseWorkItemsByTracks,
    mapObj<UIWorkItem[], TrackMetrics>(
      applySpec({
        project: () => {
          const matchingCollection = config.azure.collections.find(c => c.workitems.types?.find(t => t.track));
          const matchingProject = matchingCollection?.projects.find(p => p.name.toLowerCase().includes('portfolio'));
          return [matchingCollection?.name, matchingProject?.name] as const;
        },
        count: length,
        new: pipe(filter(isNewIn(isInQueryPeriod)), length),
        newByWeek: (wis: UIWorkItem[]) => (
          weeks.map(week => wis.filter(isNewIn(week)).length)
        ),
        velocity: pipe(filter(wasWorkItemCompletedInQueryPeriod), length),
        velocityByWeek: (wis: UIWorkItem[]) => (
          weeks.map(week => wis.filter(wasWorkItemCompletedIn(week)).length)
        ),
        cycleTime: pipe(
          filter(wasWorkItemCompletedInQueryPeriod),
          map(computeTimeDifferenceBetween('start', 'end'))
        ),
        cycleTimeByWeek: (wis: UIWorkItem[]) => (
          weeks.map(week => (
            wis
              .filter(wasWorkItemCompletedIn(week))
              .map(computeTimeDifferenceBetween('start', 'end'))
          ))
        ),
        changeLeadTime: pipe(
          filter(wasWorkItemCompletedInQueryPeriod),
          map(computeTimeDifferenceBetween('devComplete', 'end'))
        ),
        changeLeadTimeByWeek: (wis: UIWorkItem[]) => (
          weeks.map(week => (
            wis
              .filter(wasWorkItemCompletedIn(week))
              .map(computeTimeDifferenceBetween('devComplete', 'end'))
          ))
        ),
        flowEfficiency: pipe(filter(wasWorkItemCompletedInQueryPeriod), flowEfficiency(workItemTimes)),
        flowEfficiencyByWeek: (wis: UIWorkItem[]) => (
          weeks.map(week => flowEfficiency(workItemTimes)(
            wis.filter(wasWorkItemCompletedIn(week))
          ))
        ),
        wipTrend: (wis: UIWorkItem[]) => (
          weekLimits.map(limit => wis.filter(isWIPIn(limit)).length)
        ),
        wipCount: pipe(filter(wipWorkItems), length),
        wipAge: pipe(filter(wipWorkItems), map(computeTimeDifferenceBetween('start')))
      })
    )
  )(workItemsWithTracks);
};

export const byTrack = (config: ParsedConfig, results: Result[]): TrackwiseData => {
  const resultsBy = mergeProp(results);
  const workItemsWithTracks = Object.values(resultsBy('byId')).filter(prop('track'));

  const times = resultsBy('times');

  const workItemTimes = workItemsWithTracks
    .reduce<Record<number, WorkItemTimes>>((acc, workItem) => {
      acc[workItem.id] = times[workItem.id];
      return acc;
    }, {});

  const allWorkItemTypes = resultsBy('types');

  const workItemTypes = [
    ...workItemsWithTracks
      .reduce((acc, workItem) => {
        acc.add(workItem.typeId);
        return acc;
      }, new Set<string>())
  ].reduce<Record<string, UIWorkItemType>>(
    (acc, curr) => ({ ...acc, [curr]: allWorkItemTypes[curr] }),
    {}
  );

  const allGroups = resultsBy('groups');

  const groups = [
    ...workItemsWithTracks
      .reduce((acc, workItem) => {
        if (workItem.groupId) acc.add(workItem.groupId);
        return acc;
      }, new Set<string>())
  ].reduce<Record<string, { witId: string; name: string}>>(
    (acc, curr) => ({ ...acc, [curr]: allGroups[curr] }),
    {}
  );

  return {
    workItems: workItemsWithTracks, times: workItemTimes, types: workItemTypes, groups
  };
};

export default trackMetrics;
