import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applySpec, filter, length, map, pipe, prop } from 'rambda';
import type {
  TrackwiseData,
  UIWorkItemType,
  WorkItemTimes,
  Overview,
  UIWorkItem,
  TrackMetrics,
  ProjectOverviewAnalysis,
} from '../../../shared/types.js';
import { exists, mapObj } from '../../../shared/utils.js';
import type { WorkItemTimesGetter } from '../../../shared/work-item-utils.js';
import {
  totalCycleTime,
  totalWorkCenterTime,
  isWIP,
  isWIPInTimeRange,
  timeDifference,
} from '../../../shared/work-item-utils.js';
import { isAfter, queryPeriodDays, weekLimits, weeks } from '../../utils.js';
import type {
  ParsedCollection,
  ParsedConfig,
  ParsedProjectConfig,
} from '../parse-config.js';

const looksLikeDate = (value: string) =>
  /\d{4}-[01]\d-[0-3]\dT[0-2](?:\d:[0-5]){2}\d(.*Z)/.test(value);

const parseDate = (_: string, value: unknown) => {
  if (typeof value !== 'string') return value;
  if (!looksLikeDate(value)) return value;
  return new Date(value);
};

const getOverview = async (collection: string, project: string) =>
  (
    JSON.parse(
      await readFile(
        join(process.cwd(), 'data', collection, project, 'overview.json'),
        'utf8'
      ),
      parseDate
    ) as ProjectOverviewAnalysis
  ).overview;

type Result = {
  collectionConfig: ParsedCollection;
  projectConfig: ParsedProjectConfig;
};

const hasWorkItemCompleted =
  (workItemTimes: WorkItemTimesGetter) =>
  (isMatchingDate: (d: Date) => boolean) =>
  (workItem: UIWorkItem) => {
    const { start, end } = workItemTimes(workItem);
    return Boolean(start && end && isMatchingDate(new Date(end)));
  };

const computeTimeDifference =
  (workItemTimes: WorkItemTimesGetter) =>
  (
    start: keyof Omit<Overview['times'][number], 'workCenters'>,
    end?: keyof Omit<Overview['times'][number], 'workCenters'>
  ) =>
  (workItem: UIWorkItem) => {
    const wits = workItemTimes(workItem);
    const { [start]: startTime } = wits;
    const endTime = end ? wits[end] : undefined;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return timeDifference({ start: startTime!, end: endTime });
  };

export const isNewWithTimes =
  (workItemTimes: (wi: UIWorkItem) => WorkItemTimes) =>
  (isWithinTimeRange: (d: Date) => boolean) =>
  (wi: UIWorkItem) => {
    const { start } = workItemTimes(wi);
    return Boolean(start && isWithinTimeRange(new Date(start)));
  };

export const organiseWorkItemsByTracks = (wis: UIWorkItem[]) =>
  wis.reduce<Record<string, UIWorkItem[]>>((acc, wi) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const trackName = wi.track!;
    acc[trackName] = acc[trackName] || [];
    acc[trackName].push(wi);
    return acc;
  }, {});

const metricsForResult =
  (isInQueryPeriod: (date: Date) => boolean) => async (result: Result) => {
    const configWorkItemsWithTracks = result.collectionConfig.workitems.types?.filter(
      wit => wit.track
    );
    if (!configWorkItemsWithTracks) return;

    const { times, byId } = await getOverview(
      result.collectionConfig.name,
      result.projectConfig.name
    );

    const workItemsWithTracks = Object.values(byId).filter(prop('track'));
    if (workItemsWithTracks.length === 0) return;

    const workItemTimes = (wi: UIWorkItem) => times[wi.id];
    const computeTimeDifferenceBetween = computeTimeDifference(workItemTimes);
    const wasWorkItemCompletedIn = hasWorkItemCompleted(workItemTimes);
    const wasWorkItemCompletedInQueryPeriod = wasWorkItemCompletedIn(isInQueryPeriod);
    const { ignoreForWIP } = result.projectConfig.workitems;

    const isWIPIn = ([, weekEnd]: readonly [Date, Date]) =>
      isWIPInTimeRange(
        workItemTimes,
        ignoreForWIP
      )((d, type) => {
        if (type === 'start') return d <= weekEnd;
        return d < weekEnd;
      });

    const flowEfficiency = (() => {
      const tct = totalCycleTime(workItemTimes);
      const wct = totalWorkCenterTime(workItemTimes);

      return (wis: UIWorkItem[]) => {
        const total = tct(wis);
        if (total === 0) {
          return { total: 0, wcTime: 0 };
        }
        const wcTime = wct(wis);
        return { total, wcTime };
      };
    })();

    const wipWorkItems = isWIP(workItemTimes, ignoreForWIP);
    const isNewIn = isNewWithTimes(workItemTimes);

    return {
      collection: result.collectionConfig.name,
      project: result.projectConfig.name,
      filterLabel: result.collectionConfig.workitems.filterBy?.find(f =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        f.fields.some(f => configWorkItemsWithTracks.map(w => w.track!).includes(f))
      )?.label,
      byTrack: pipe(
        organiseWorkItemsByTracks,
        mapObj<UIWorkItem[], TrackMetrics>(
          applySpec({
            count: length,
            new: pipe(filter(isNewIn(isInQueryPeriod)), length),
            newByWeek: (wis: UIWorkItem[]) =>
              weeks.map(week => wis.filter(isNewIn(week)).length),
            velocity: pipe(filter(wasWorkItemCompletedInQueryPeriod), length),
            velocityByWeek: (wis: UIWorkItem[]) =>
              weeks.map(week => wis.filter(wasWorkItemCompletedIn(week)).length),
            cycleTime: pipe(
              filter(wasWorkItemCompletedInQueryPeriod),
              map(computeTimeDifferenceBetween('start', 'end'))
            ),
            cycleTimeByWeek: (wis: UIWorkItem[]) =>
              weeks.map(week =>
                wis
                  .filter(wasWorkItemCompletedIn(week))
                  .map(computeTimeDifferenceBetween('start', 'end'))
              ),
            changeLeadTime: pipe(
              filter(wasWorkItemCompletedInQueryPeriod),
              map(computeTimeDifferenceBetween('devComplete', 'end'))
            ),
            changeLeadTimeByWeek: (wis: UIWorkItem[]) =>
              weeks.map(week =>
                wis
                  .filter(wasWorkItemCompletedIn(week))
                  .map(computeTimeDifferenceBetween('devComplete', 'end'))
              ),
            flowEfficiency: pipe(
              filter(wasWorkItemCompletedInQueryPeriod),
              flowEfficiency
            ),
            flowEfficiencyByWeek: (wis: UIWorkItem[]) =>
              weeks.map(week => flowEfficiency(wis.filter(wasWorkItemCompletedIn(week)))),
            wipTrend: (wis: UIWorkItem[]) =>
              weekLimits.map(limit => wis.filter(isWIPIn(limit)).length),
            wipCount: pipe(filter(wipWorkItems), length),
            wipAge: pipe(
              filter(wipWorkItems),
              map(computeTimeDifferenceBetween('start'))
            ),
          })
        )
      )(workItemsWithTracks),
    };
  };

export const trackMetrics = (config: ParsedConfig, results: Result[]) =>
  Promise.all(
    results
      .map(metricsForResult(isAfter(`${queryPeriodDays(config)} days`)))
      .filter(exists)
  ).then(x => x.filter(exists));

export const trackFeatures = (
  config: ParsedConfig,
  results: Result[]
): Promise<TrackwiseData[]> =>
  Promise.all(
    results.map(async result => {
      const configWorkItemsWithTracks = result.collectionConfig.workitems.types?.filter(
        wit => wit.track
      );
      if (!configWorkItemsWithTracks) return;

      const {
        times,
        byId,
        types,
        groups: allGroups,
      } = await getOverview(result.collectionConfig.name, result.projectConfig.name);

      const workItemsWithTracks = Object.values(byId).filter(prop('track'));
      if (workItemsWithTracks.length === 0) return;

      const workItemTimes = workItemsWithTracks.reduce<Record<number, WorkItemTimes>>(
        (acc, workItem) => {
          acc[workItem.id] = times[workItem.id];
          return acc;
        },
        {}
      );

      const workItemTypes = [
        ...workItemsWithTracks.reduce((acc, workItem) => {
          acc.add(workItem.typeId);
          return acc;
        }, new Set<string>()),
      ].reduce<Record<string, UIWorkItemType>>(
        (acc, curr) => ({ ...acc, [curr]: types[curr] }),
        {}
      );

      const groups = [
        ...workItemsWithTracks.reduce((acc, workItem) => {
          if (workItem.groupId) acc.add(workItem.groupId);
          return acc;
        }, new Set<string>()),
      ].reduce<Record<string, { witId: string; name: string }>>(
        (acc, curr) => ({ ...acc, [curr]: allGroups[curr] }),
        {}
      );

      return {
        collection: result.collectionConfig.name,
        project: result.projectConfig.name,
        workItems: workItemsWithTracks,
        filterLabel: result.collectionConfig.workitems.filterBy?.find(f =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          f.fields.some(f => configWorkItemsWithTracks.map(w => w.track!).includes(f))
        )?.label,
        times: workItemTimes,
        types: workItemTypes,
        groups,
      };
    })
  ).then(x => x.filter(exists));
