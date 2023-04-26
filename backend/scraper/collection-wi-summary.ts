import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { anyPass, applySpec, filter, length, map, pipe, sum } from 'rambda';
import { z } from 'zod';
import { collections, getConfig, configForProject } from '../config.js';
import type {
  Overview,
  ProjectOverviewAnalysis,
  UIWorkItem,
  UIWorkItemType,
} from '../../shared/types.js';
import type { WorkItemTimesGetter } from '../../shared/work-item-utils.js';
import {
  isBug,
  noGroup,
  isNewInTimeRange,
  isWIP,
  isWIPInTimeRange,
  totalCycleTime,
  totalWorkCenterTime,
  timeDifference,
} from '../../shared/work-item-utils.js';
import { isAfter, queryPeriodDays, weekLimits, weeks } from '../utils.js';
import { mapObj } from '../../shared/utils.js';
import type { ParsedProjectConfig } from './parse-config.js';

const looksLikeDate = (value: string) =>
  /\d{4}-[01]\d-[0-3]\dT[0-2](?:\d:[0-5]){2}\d(.*Z)/.test(value);

const parseDate = (_: string, value: unknown) => {
  if (typeof value !== 'string') return value;
  if (!looksLikeDate(value)) return value;
  return new Date(value);
};

const parseFile = async <T>(collection: string, project: string, file: string) =>
  JSON.parse(
    await readFile(join(process.cwd(), 'data', collection, project, file), 'utf8'),
    parseDate
  ) as T;

const getOverview = async (collection: string, project: string) =>
  (await parseFile<ProjectOverviewAnalysis>(collection, project, 'overview.json'))
    .overview;

const concernedTypes = [
  (wit: UIWorkItemType) => wit.name[0] === 'Feature',
  isBug,
  (wit: UIWorkItemType) => wit.name[0] === 'User Story',
];

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

const hasWorkItemCompleted =
  (workItemTimes: WorkItemTimesGetter) =>
  (isMatchingDate: (d: Date) => boolean) =>
  (workItem: UIWorkItem) => {
    const { start, end } = workItemTimes(workItem);
    return Boolean(start && end && isMatchingDate(new Date(end)));
  };

const organiseWorkItemsIntoGroups = (workItems: UIWorkItem[]) =>
  workItems.reduce<Record<string, Record<string, UIWorkItem[]>>>((acc, workItem) => {
    acc[workItem.typeId] = acc[workItem.typeId] || {};
    acc[workItem.typeId][workItem.groupId || noGroup] =
      acc[workItem.typeId][workItem.groupId || noGroup] || [];

    acc[workItem.typeId][workItem.groupId || noGroup].push(workItem);
    return acc;
  }, {});

const analyseProjects = (collectionName: string, projects: ParsedProjectConfig[]) => {
  const isInQueryPeriod = isAfter(`${queryPeriodDays(getConfig())} days`);
  return Promise.all(
    projects.map(async ({ name: project }) => {
      const overview = await getOverview(collectionName, project);
      const projectConfig = configForProject(collectionName, project);

      const workItemTimes = (wi: UIWorkItem) => overview.times[wi.id];
      const workItemType = (witId: string) => overview.types[witId];

      const computeTimeDifferenceBetween = computeTimeDifference(workItemTimes);
      const wasWorkItemCompletedIn = hasWorkItemCompleted(workItemTimes);
      const wasWorkItemCompletedInQueryPeriod = wasWorkItemCompletedIn(isInQueryPeriod);

      const wipWorkItems = isWIP(
        workItemTimes,
        projectConfig?.workitems.ignoreForWIP || []
      );
      const isOfType =
        (isType: (wit: UIWorkItemType) => boolean) => (workItem: UIWorkItem) =>
          isType(overview.types[workItem.typeId]);

      const leakage = isNewInTimeRange(workItemType, workItemTimes);
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

      const isWIPIn = ([, weekEnd]: readonly [Date, Date]) =>
        isWIPInTimeRange(
          workItemTimes,
          projectConfig?.workitems.ignoreForWIP || []
        )((d, type) => {
          if (type === 'start') return d <= weekEnd;
          return d < weekEnd;
        });

      return {
        project,
        types: overview.types,
        groups: overview.groups,
        byType: pipe(
          filter(anyPass(concernedTypes.map(isOfType))),
          organiseWorkItemsIntoGroups,
          pipe(
            mapObj,
            mapObj
          )(
            applySpec({
              count: length,
              velocity: pipe(filter(wasWorkItemCompletedInQueryPeriod), length),
              velocityByWeek: (wis: UIWorkItem[]) =>
                weeks.map(week => wis.filter(wasWorkItemCompletedIn(week)).length),
              cycleTime: pipe(
                filter(wasWorkItemCompletedInQueryPeriod),
                map(computeTimeDifferenceBetween('start', 'end')),
                times => ({ count: sum(times), wis: times.length })
              ),
              cycleTimeByWeek: (wis: UIWorkItem[]) =>
                weeks.map(week => {
                  const cycleTimes = wis
                    .filter(wasWorkItemCompletedIn(week))
                    .map(computeTimeDifferenceBetween('start', 'end'));
                  return { count: sum(cycleTimes), wis: cycleTimes.length };
                }),
              changeLeadTime: pipe(
                filter(wasWorkItemCompletedInQueryPeriod),
                map(computeTimeDifferenceBetween('devComplete', 'end')),
                times => ({ count: sum(times), wis: times.length })
              ),
              changeLeadTimeByWeek: (wis: UIWorkItem[]) =>
                weeks.map(week => {
                  const clts = wis
                    .filter(wasWorkItemCompletedIn(week))
                    .map(computeTimeDifferenceBetween('devComplete', 'end'));
                  return { count: sum(clts), wis: clts.length };
                }),
              flowEfficiency: pipe(
                filter(wasWorkItemCompletedInQueryPeriod),
                flowEfficiency
              ),
              flowEfficiencyByWeek: (wis: UIWorkItem[]) =>
                weeks.map(week =>
                  flowEfficiency(wis.filter(wasWorkItemCompletedIn(week)))
                ),
              wipTrend: (wis: UIWorkItem[]) =>
                weekLimits.map(limit => wis.filter(isWIPIn(limit)).length),
              wipCount: pipe(filter(wipWorkItems), length),
              wipAge: pipe(
                filter(wipWorkItems),
                map(computeTimeDifferenceBetween('start')),
                ages => ({ count: sum(ages), wis: ages.length })
              ),
              leakage: pipe(filter(leakage(isInQueryPeriod)), length),
              leakageByWeek: (wis: UIWorkItem[]) =>
                weeks.map(week => wis.filter(leakage(week)).length),
            })
          )
        )(Object.values(overview.byId)),
      };
    })
  );
};

const collectionWorkitemSummary = () => {
  return Promise.all(
    collections().map(async ({ name: collectionName, projects }) => {
      const analysed = await analyseProjects(collectionName, projects);
      const {
        types,
        groups,
        projects: analysedProjects,
      } = analysed.reduce<{
        types: Record<string, UIWorkItemType>;
        groups: Record<
          string,
          {
            witId: string;
            name: string;
          }
        >;
        projects: Omit<
          Awaited<ReturnType<typeof analyseProjects>>[number],
          'types' | 'groups'
        >[];
      }>(
        (acc, p) => {
          const { types, groups, ...rest } = p;
          return {
            types: { ...acc.types, ...types },
            projects: [...acc.projects, rest],
            groups: { ...acc.groups, ...groups },
          };
        },
        { types: {}, groups: {}, projects: [] }
      );

      return writeFile(
        join(process.cwd(), 'data', collectionName, 'collection-summary.json'),
        JSON.stringify({
          collectionName,
          projects: analysedProjects,
          types: Object.fromEntries(
            Object.entries(types).filter(([, value]) => {
              return concernedTypes.some(x => x(value));
            })
          ),
          groups,
        })
      );
    })
  );
};

export default collectionWorkitemSummary;

export type CollectionSummary = {
  collectionName: string;
  projects: Awaited<ReturnType<typeof analyseProjects>>;
  types: Record<string, UIWorkItemType>;
  groups: Record<
    string,
    {
      witId: string;
      name: string;
    }
  >;
};

export const ReadSummaryInputParser = z.object({
  collectionName: z.string(),
});

export const readCollectionWorkItemsSummary = async ({
  collectionName,
}: z.infer<typeof ReadSummaryInputParser>) => {
  return JSON.parse(
    await readFile(
      join(process.cwd(), 'data', collectionName, 'collection-summary.json'),
      'utf8'
    )
  ) as CollectionSummary;
};
