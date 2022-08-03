import {
  always, anyPass, applySpec, compose, filter, length, map, not,
  pipe, prop, subtract, T
} from 'rambda';
import type {
  Overview, RepoAnalysis, UIBuildPipeline, UIWorkItem, UIWorkItemType
} from '../../shared/types.js';
import {
  isAfter, queryPeriodDays, weekLimits, weeks
} from '../utils.js';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config.js';
import type { ProjectAnalysis } from './types.js';
import type { WorkItemTimesGetter } from '../../shared/work-item-utils.js';
import {
  noGroup, isNewInTimeRange, isWIP, isWIPInTimeRange, timeDifference,
  totalCycleTime, totalWorkCenterTime
} from '../../shared/work-item-utils.js';
import { incrementBy, incrementIf, count } from '../../shared/reducer-utils.js';
import {
  isPipelineInGroup, masterDeploysCount, masterOnlyReleasesByWeek, normalizePolicy, pipelineHasStageNamed,
  pipelineHasStartingArtifact,
  pipelineMeetsBranchPolicyRequirements, pipelineUsesStageNamed, totalUsageByEnvironment
} from '../../shared/pipeline-utils.js';
import {
  buildPipelines, healthyBranches, isInactive, isYmlPipeline, newSonarSetupsByWeek, reposWithPipelines,
  sonarCountsByWeek, totalBuilds, totalBuildsByWeek, totalCoverage,
  totalCoverageByWeek, totalSuccessfulBuildsByWeek, totalTests, totalTestsByWeek, totalUsingCentralTemplate
} from '../../shared/repo-utils.js';
import { divide, exists, toPercentage } from '../../shared/utils.js';

type Group = NonNullable<ParsedConfig['azure']['summaryPageGroups']>[number];
type RelevantResults = {
  collection: string;
  project: string;
  workItems: UIWorkItem[];
  workItemTypes: Record<string, UIWorkItemType>;
  groups: Overview['groups'];
  workItemTimes: Overview['times'];
};

type Result = {
  collectionConfig: ParsedCollection;
  projectConfig: ParsedProjectConfig;
  analysisResult: ProjectAnalysis;
};

const groupType = (group: Group): [string, string] | 'project' => {
  const remainingKey = Object.entries(group)
    .filter(([key]) => key !== 'collection' && key !== 'project')[0];

  return remainingKey || 'project';
};

const matchingResults = (group: Group, results: Result[]) => {
  const gt = groupType(group);

  return (
    results.reduce<RelevantResults[]>((acc, result) => {
      if (result.collectionConfig.name !== group.collection) return acc;
      if (
        result.projectConfig.name === group.project
        || result.projectConfig.name === group.portfolioProject
      ) {
        acc.push({
          collection: result.collectionConfig.name,
          project: result.projectConfig.name,
          workItems: Object.values(result.analysisResult.workItemAnalysis.overview.byId)
            .filter(workItem => workItem.filterBy?.some(
              filter => filter.label === gt[0] && filter.tags.includes(gt[1])
            )),
          workItemTypes: result.analysisResult.workItemAnalysis.overview.types,
          groups: result.analysisResult.workItemAnalysis.overview.groups,
          workItemTimes: result.analysisResult.workItemAnalysis.overview.times
        });
      }

      return acc;
    }, [])
  );
};

type UIWorkItemWithGroup = Omit<UIWorkItem, 'groupId'> & {
  group?: Overview['groups'][string];
};

const addGroupToWorkItem = (groups: Overview['groups']) => (
  (workItem: UIWorkItem): UIWorkItemWithGroup => ({
    ...workItem,
    group: workItem.groupId ? groups[workItem.groupId] : undefined
  })
);

const mergeResults = (results: RelevantResults[]) => (
  results.reduce<{
    workItems: UIWorkItemWithGroup[];
    workItemTypes: Record<string, UIWorkItemType>;
    workItemTimes: Overview['times'];
  }>((acc, result) => {
    acc.workItems = acc.workItems.concat(
      result.workItems.map(addGroupToWorkItem(result.groups))
    );
    acc.workItemTypes = {
      ...acc.workItemTypes,
      ...result.workItemTypes
    };
    acc.workItemTimes = {
      ...acc.workItemTimes,
      ...result.workItemTimes
    };

    return acc;
  }, { workItems: [], workItemTypes: {}, workItemTimes: {} })
);

const groupKey = (group?: Overview['groups'][string]) => (group ? group.name : noGroup);

const hasWorkItemCompleted = (workItemTimes: WorkItemTimesGetter) => (
  (isMatchingDate: (d: Date) => boolean) => (
    (workItem: UIWorkItemWithGroup) => {
      const { start, end } = workItemTimes(workItem);
      return Boolean(start && end && isMatchingDate(new Date(end)));
    }
  )
);

const organiseWorkItemsIntoGroups = (workItems: UIWorkItemWithGroup[]) => (
  workItems
    .reduce<Record<string, Record<string, UIWorkItemWithGroup[]>>>((acc, workItem) => {
      acc[workItem.typeId] = acc[workItem.typeId] || {};
      acc[workItem.typeId][groupKey(workItem.group)] = (
        acc[workItem.typeId][groupKey(workItem.group)] || []
      );

      acc[workItem.typeId][groupKey(workItem.group)].push(workItem);
      return acc;
    }, {})
);

const mapObjectValues = <T, U>(mapFn: (v: T) => U) => (obj: Record<string, T>) => (
  Object.entries(obj).reduce<Record<string, U>>((acc, [key, value]) => {
    acc[key] = mapFn(value);
    return acc;
  }, {})
);

const processItemsInGroup = pipe(mapObjectValues, mapObjectValues);

const computeTimeDifference = (workItemTimes: WorkItemTimesGetter) => (
  (start: keyof Omit<Overview['times'][number], 'workCenters'>, end?: keyof Omit<Overview['times'][number], 'workCenters'>) => (
    (workItem: UIWorkItemWithGroup) => {
      const wits = workItemTimes(workItem);
      const { [start]: startTime } = wits;
      const endTime = end ? wits[end] : undefined;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return timeDifference({ start: startTime!, end: endTime });
    }
  )
);

type Summary = {
  groupName: string;
  workItems: Record<string, Record<string, {
    count: number;
    velocity: number;
    velocityByWeek: number[];
    cycleTime: number[];
    cycleTimeByWeek: number[][];
    changeLeadTime: number[];
    changeLeadTimeByWeek: number[][];
    flowEfficiency: { total: number; wcTime: number };
    flowEfficiencyByWeek: { total: number; wcTime: number }[];
    wipTrend: number[];
    wipCount: number;
    wipAge: number[];
    leakage: number;
    leakageByWeek: number[];
  }>>;
  repoStats: {
    repos: number;
    excluded: number;
    tests: number;
    testsByWeek: number[];
    builds: {
      total: number;
      successful: number;
      byWeek: number[];
      successfulByWeek: number[];
    };
    codeQuality: {
      configured: number;
      sonarProjects: number;
      pass: number;
      warn: number;
      fail: number;
    };
    newSonarSetupsByWeek: number[];
    sonarCountsByWeek: ReturnType<typeof sonarCountsByWeek>;
    coverage: string;
    coverageByWeek: number[];
    ymlPipelines: { count: number; total: number };
    hasPipelines: number;
    usesCentralTemplate: { count: number; total: number };
    healthyBranches: { count: number; total: number };
  };
  pipelineStats: {
    pipelines: number;
    stages: {
      name: string;
      exists: number;
      used: number;
    }[];
    masterOnlyPipelines: {
      count: number;
      total: number;
    };
    conformsToBranchPolicies: number;
    startsWithArtifact: number;
    usageByEnvironment: Record<string, { total: number; successful: number }>;
    masterOnlyReleasesByWeek: (number | undefined)[];
  };
  collection: string;
  project: string;
  portfolioProject: string;
  environments?: string[];
};

const analyseWorkItems = (
  results: { workItems: UIWorkItemWithGroup[]; workItemTypes: Record<string, UIWorkItemType>; workItemTimes: Overview['times'] },
  isInQueryPeriod: (d: Date) => boolean,
  projectConfig?: ParsedProjectConfig
) => {
  const workItemTimes = (wi: UIWorkItem) => results.workItemTimes[wi.id];
  const workItemType = (witId: string) => results.workItemTypes[witId];

  const computeTimeDifferenceBetween = computeTimeDifference(workItemTimes);
  const wasWorkItemCompletedIn = hasWorkItemCompleted(workItemTimes);
  const wasWorkItemCompletedInQueryPeriod = wasWorkItemCompletedIn(isInQueryPeriod);

  const wipWorkItems = isWIP(workItemTimes, projectConfig?.workitems.ignoreForWIP || []);
  const isOfType = (type: string) => (workItem: UIWorkItemWithGroup) => (
    results.workItemTypes[workItem.typeId].name[0] === type
  );
  const leakage = isNewInTimeRange(workItemType, workItemTimes);
  const flowEfficiency = (() => {
    const tct = totalCycleTime(workItemTimes);
    const wct = totalWorkCenterTime(workItemTimes);

    return (wis: UIWorkItem[]) => {
      const total = tct(wis);
      if (total === 0) { return { total: 0, wcTime: 0 }; }
      const wcTime = wct(wis);
      return { total, wcTime };
    };
  })();

  const isWIPIn = ([, weekEnd]: readonly [Date, Date]) => (
    isWIPInTimeRange(
      workItemTimes,
      projectConfig?.workitems.ignoreForWIP || []
    )((d, type) => {
      if (type === 'start') return d <= weekEnd;
      return d < weekEnd;
    })
  );

  return pipe(
    filter(anyPass([isOfType('Feature'), isOfType('Bug'), isOfType('User Story')])),
    organiseWorkItemsIntoGroups,
    processItemsInGroup(
      applySpec({
        count: length,
        velocity: pipe(filter(wasWorkItemCompletedInQueryPeriod), length),
        velocityByWeek: (wis: UIWorkItem[]) => (
          weeks.map(
            week => wis.filter(wasWorkItemCompletedIn(week)).length
          )
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
        flowEfficiency: pipe(filter(wasWorkItemCompletedInQueryPeriod), flowEfficiency),
        flowEfficiencyByWeek: (wis: UIWorkItem[]) => (
          weeks.map(week => flowEfficiency(
            wis.filter(wasWorkItemCompletedIn(week))
          ))
        ),
        wipTrend: (wis: UIWorkItem[]) => (
          weekLimits.map(limit => wis.filter(isWIPIn(limit)).length)
        ),
        wipCount: pipe(filter(wipWorkItems), length),
        wipAge: pipe(filter(wipWorkItems), map(computeTimeDifferenceBetween('start'))),
        leakage: pipe(filter(leakage(isInQueryPeriod)), length),
        leakageByWeek: (wis: UIWorkItem[]) => (
          weeks.map(week => wis.filter(leakage(week)).length)
        )
      })
    )
  )(results.workItems);
};

const summariseResults = (config: ParsedConfig, results: Result[]) => {
  const { summaryPageGroups } = config.azure;
  if (!summaryPageGroups) {
    return {
      groups: [] as Summary[],
      workItemTypes: {} as Record<string, UIWorkItemType>,
      lastUpdateDate: new Date().toISOString()
    };
  }

  return summaryPageGroups
    .map(group => {
      const projectConfig = config.azure.collections
        .find(c => c.name === group.collection)
        ?.projects.find(p => p.name === group.project);

      const match = matchingResults(group, results);
      if (!match.length) return null;

      const mergedResults = mergeResults(match);

      const resultsForThisProject = results.find(r => (
        r.collectionConfig.name === group.collection
        && r.projectConfig.name === group.project
      ));

      const repoNames = projectConfig?.groupRepos?.groups[groupType(group)[1]] || [];

      const matchingRepos = (repoNames: string[]) => {
        const allRepos = resultsForThisProject?.analysisResult.repoAnalysis || [];

        return repoNames.length === 0
          ? allRepos
          : allRepos.filter(r => repoNames.includes(r.name));
      };

      const repoStats = (): Summary['repoStats'] => {
        const matches = matchingRepos(repoNames);
        const matchesExcludingInactive = matches.filter(compose(not, isInactive));

        const codeQuality = (repos: RepoAnalysis[]) => repos
          .reduce((acc, repo) => ({
            ...(repo.codeQuality || []).reduce((acc, q) => ({
              ...acc,
              pass: acc.pass + (q.quality.gate === 'pass' ? 1 : 0),
              warn: acc.warn + (q.quality.gate === 'warn' ? 1 : 0),
              fail: acc.fail + (q.quality.gate === 'fail' ? 1 : 0),
              sonarProjects: acc.sonarProjects + 1
            }), acc),
            configured: acc.configured + (repo.codeQuality ? 1 : 0)
          }), {
            pass: 0, warn: 0, fail: 0, configured: 0, sonarProjects: 0
          });

        const coverage = totalCoverage(matchesExcludingInactive);
        const coverageByWeek = totalCoverageByWeek(matchesExcludingInactive);
        const pipelines = buildPipelines(matchesExcludingInactive);

        return {
          repos: length(matchesExcludingInactive),
          excluded: pipe(length, subtract(length(matches)))(matchesExcludingInactive),
          tests: totalTests(matchesExcludingInactive),
          testsByWeek: totalTestsByWeek(matchesExcludingInactive),
          builds: {
            total: totalBuilds(matchesExcludingInactive),
            successful: count<RepoAnalysis>(incrementBy(
              repo => count<UIBuildPipeline>(incrementBy(prop('success')))(repo.builds?.pipelines || [])
            ))(matchesExcludingInactive),
            byWeek: totalBuildsByWeek(matchesExcludingInactive),
            successfulByWeek: totalSuccessfulBuildsByWeek(matchesExcludingInactive)
          },
          codeQuality: codeQuality(matchesExcludingInactive),
          newSonarSetupsByWeek: newSonarSetupsByWeek(matchesExcludingInactive),
          sonarCountsByWeek: sonarCountsByWeek(matchesExcludingInactive),
          coverage: divide(coverage.covered, coverage.total).map(toPercentage).getOr('-'),
          coverageByWeek,
          ymlPipelines: { count: pipelines.filter(isYmlPipeline).length, total: pipelines.length },
          hasPipelines: reposWithPipelines(matchesExcludingInactive).length,
          usesCentralTemplate: totalUsingCentralTemplate(matchesExcludingInactive),
          healthyBranches: healthyBranches(matchesExcludingInactive)
        };
      };

      const pipelineStats = (): Summary['pipelineStats'] => {
        const matchingPipelines = (resultsForThisProject?.analysisResult.releaseAnalysis.pipelines || [])
          .filter(
            repoNames.length === 0 ? T : isPipelineInGroup(groupType(group)[1], repoNames)
          );

        return {
          pipelines: length(matchingPipelines),
          stages: (projectConfig?.releasePipelines.stagesToHighlight || []).map(stage => applySpec({
            name: always(stage),
            exists: count(incrementIf(pipelineHasStageNamed(stage))),
            used: count(incrementIf(pipelineUsesStageNamed(stage)))
          })(matchingPipelines)),
          masterOnlyPipelines: masterDeploysCount(matchingPipelines),
          startsWithArtifact: count(incrementIf(pipelineHasStartingArtifact))(matchingPipelines),
          conformsToBranchPolicies: count(incrementIf(pipelineMeetsBranchPolicyRequirements(
            (repoId, branch) => normalizePolicy(resultsForThisProject?.analysisResult.releaseAnalysis.policies[repoId]?.[branch] || {})
          )))(matchingPipelines),
          usageByEnvironment: totalUsageByEnvironment(projectConfig?.environments)(matchingPipelines),
          masterOnlyReleasesByWeek: masterOnlyReleasesByWeek(matchingPipelines)
        };
      };

      return {
        ...group,
        groupName: groupType(group)[1],
        workItems: analyseWorkItems(mergedResults, isAfter(`${queryPeriodDays(config)} days`), projectConfig),
        repoStats: repoStats(),
        pipelineStats: pipelineStats(),
        workItemTypes: mergedResults.workItemTypes,
        environments: projectConfig?.environments
      };
    })
    .filter(exists)
    .reduce<{
      groups: Summary[];
      workItemTypes: Record<string, UIWorkItemType>;
      lastUpdateDate: string;
    }>(
      (acc, { workItemTypes, ...rest }) => {
        acc.groups.push(rest);
        acc.workItemTypes = {
          ...acc.workItemTypes,
          ...Object.entries(workItemTypes).reduce<Record<string, UIWorkItemType>>((acc, [key, value]) => {
            if (
              value.name[0] === 'User Story'
              || value.name[0] === 'Feature'
              || value.name[0] === 'Bug'
            ) {
              acc[key] = value;
            }
            return acc;
          }, {})
        };
        return acc;
      },
      { groups: [], workItemTypes: {}, lastUpdateDate: new Date().toISOString() }
    );
};

export default summariseResults;
export type SummaryMetricsType = ReturnType<typeof summariseResults>;
