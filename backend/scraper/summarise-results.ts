import {
  anyPass, applySpec, compose, filter, length, map, not, pipe
} from 'rambda';
import { isDeprecated } from '../../shared/repo-utils';
import type {
  Overview, UIWorkItem, UIWorkItemType
} from '../../shared/types';
import { exists, isWithin } from '../utils';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import type { ProjectAnalysis } from './types';

const noGroup = 'no-group';

const isWithinLastMonth = isWithin('30 days');

const timeDiff = (end: string | Date | undefined, start: string | Date | undefined) => (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  new Date(end!).getTime() - new Date(start!).getTime()
);

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

const addGroupToWorkItem = (workItem: UIWorkItem, groups: Overview['groups']): UIWorkItemWithGroup => {
  const group = workItem.groupId ? groups[workItem.groupId] : undefined;

  return {
    ...workItem,
    group
  };
};

const mergeResults = (results: RelevantResults[]) => (
  results.reduce<{
    workItems: UIWorkItemWithGroup[];
    workItemTypes: Record<string, UIWorkItemType>;
    workItemTimes: Overview['times'];
  }>((acc, result) => {
    acc.workItems = acc.workItems.concat(
      result.workItems.map(workItem => addGroupToWorkItem(workItem, result.groups))
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

const groupKey = (group?: Overview['groups'][string]) => {
  if (!group) return noGroup;
  return group.name;
};

const hasWorkItemCompleted = (times: Overview['times']) => (
  (workItem: UIWorkItemWithGroup) => {
    const { end } = times[workItem.id];
    return Boolean(end && isWithinLastMonth(new Date(end)));
  }
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

const computeTimeDifference = (workItemTimes: Overview['times']) => (
  (start: keyof Omit<Overview['times'][number], 'workCenters'>, end?: keyof Omit<Overview['times'][number], 'workCenters'>) => (
    (workItem: UIWorkItemWithGroup) => {
      const wits = workItemTimes[workItem.id];
      const { [start]: startTime } = wits;
      const endTime = end ? wits[end] : new Date();
      return timeDiff(endTime, startTime);
    }
  )
);

type Summary = {
  groupName: string;
  summary: Record<string, Record<string, {
    count: number;
    velocity: number;
    cycleTime: number[];
    changeLeadTime: number[];
    wipCount: number;
    wipAge: number[];
    leakage: number;
  }>>;
  repoStats: {
    repos: number;
    excluded: number;
    tests: number;
    builds: {
      total: number;
      successful: number;
    };
    codeQuality: {
      configured: number;
      sonarProjects: number;
      pass: number;
      warn: number;
      fail: number;
    };
  };
  pipelineStats: {
    pipelines: number;
    stages: {
      name: string;
      exists: number;
      used: number;
    }[];
    masterOnlyPipelines: number;
    conformsToBranchPolicies: number;
  };
  collection: string;
  project: string;
  portfolioProject: string;
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
      const match = matchingResults(group, results);
      if (!match.length) return null;

      const mergedResults = mergeResults(match);

      const computeTimeDifferenceBetween = computeTimeDifference(mergedResults.workItemTimes);

      const completedWorkItems = hasWorkItemCompleted(mergedResults.workItemTimes);
      const wipWorkItems = (workItem: UIWorkItemWithGroup) => {
        const { start, end } = mergedResults.workItemTimes[workItem.id];
        return Boolean(start) && !end;
      };
      const isOfType = (type: string) => (workItem: UIWorkItemWithGroup) => (
        mergedResults.workItemTypes[workItem.typeId].name[0] === type
      );
      const bugsLeaked = (workItem: UIWorkItemWithGroup) => (
        isOfType('Bug')(workItem) && isWithinLastMonth(new Date(workItem.created.on))
      );

      const workItemAnalysis = pipe(
        filter(anyPass([isOfType('Feature'), isOfType('Bug'), isOfType('User Story')])),
        organiseWorkItemsIntoGroups,
        processItemsInGroup(
          applySpec({
            count: length,
            velocity: wis => pipe(filter(completedWorkItems), length)(wis),
            cycleTime: wis => pipe(
              filter(completedWorkItems),
              map(computeTimeDifferenceBetween('start', 'end'))
            )(wis),
            changeLeadTime: wis => pipe(
              filter(completedWorkItems),
              map(computeTimeDifferenceBetween('devComplete', 'end'))
            )(wis),
            wipCount: wis => pipe(filter(wipWorkItems), length)(wis),
            wipAge: wis => pipe(
              filter(wipWorkItems),
              map(computeTimeDifferenceBetween('start'))
            )(wis),
            leakage: wis => pipe(
              filter(bugsLeaked),
              length
            )(wis)
          })
        )
      )(mergedResults.workItems);

      const resultsForThisProject = results.find(r => (
        r.collectionConfig.name === group.collection
        && r.projectConfig.name === group.project
      ));

      const getRepoNames = () => (
        config.azure.collections.find(c => c.name === group.collection)
          ?.projects.find(p => p.name === group.project)
          ?.groupRepos?.groups[groupType(group)[1]] || []
      );

      const matchingRepos = (repoNames: string[]) => {
        const allRepos = resultsForThisProject?.analysisResult.repoAnalysis || [];

        return repoNames.length === 0
          ? allRepos
          : allRepos.filter(r => repoNames.includes(r.name));
      };

      const repoStats = () => {
        const matches = matchingRepos(getRepoNames());
        const matchesExcludingDeprecated = matches.filter(compose(not, isDeprecated));

        const codeQuality = () => (
          matchesExcludingDeprecated
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
            })
        );

        return {
          repos: matchesExcludingDeprecated.length,
          excluded: matches.length - matchesExcludingDeprecated.length,
          tests: matchesExcludingDeprecated.reduce((acc, repo) => acc + (repo.tests?.total || 0), 0),
          builds: {
            total: matchesExcludingDeprecated.reduce((acc, repo) => acc + (repo.builds?.count || 0), 0),
            successful: matchesExcludingDeprecated.reduce(
              (acc, repo) => (
                acc + (repo.builds?.pipelines.reduce((acc, p) => acc + p.success, 0) || 0)
              ),
              0
            )
          },
          codeQuality: codeQuality()
        };
      };

      const matchingPipelines = (repoNames: string[]) => {
        const allPipelines = resultsForThisProject?.analysisResult.releaseAnalysis.pipelines || [];

        return repoNames.length === 0
          ? allPipelines
          : allPipelines.filter(p => Object.values(p.repos).some(r => repoNames.includes(r.name)));
      };

      const pipelineStats = () => {
        const matches = matchingPipelines(getRepoNames());

        return {
          pipelines: matches.length,
          stages: config.azure.collections[0].projects[0].releasePipelines.stagesToHighlight.map(stage => ({
            name: stage,
            exists: matches.reduce((acc, p) => acc + (
              p.stageCounts.map(s => s.name)
                .some(s => s.toLowerCase().includes(stage.toLowerCase())) ? 1 : 0
            ), 0),
            used: matches.reduce((acc, p) => acc + (
              p.stageCounts
                .filter(s => s.name.toLowerCase().includes(stage.toLowerCase()))
                .some(s => s.successful > 0)
                ? 1 : 0
            ), 0)
          })),
          masterOnlyPipelines: matches.reduce((acc, p) => {
            const repoBranches = [...new Set(Object.values(p.repos).flatMap(r => r.branches))];

            return acc + (
              repoBranches.length === 1 && repoBranches[0] === 'refs/heads/master'
                ? 1 : 0
            );
          }, 0),
          conformsToBranchPolicies: matches.reduce((acc, p) => (
            acc + (
              Object.keys(p.repos).every(repoId => {
                const policies = resultsForThisProject?.analysisResult.releaseAnalysis.policies;
                if (!policies) return false;
                const policy = policies[repoId];
                if (!policy) return false;

                return p.repos[repoId].branches.every(branch => {
                  const policyForBranch = policy[branch];
                  if (!policyForBranch) return false;
                  return !policyForBranch.minimumNumberOfReviewers?.isOptional
                    && (policyForBranch.minimumNumberOfReviewers?.count || 0) > 0
                    && !policyForBranch.commentRequirements?.isOptional
                    && !policyForBranch.builds?.isOptional
                    && !policyForBranch.workItemLinking?.isOptional;
                });
              }) ? 1 : 0)
          ), 0)
        };
      };

      return {
        ...group,
        groupName: groupType(group)[1],
        summary: workItemAnalysis,
        repoStats: repoStats(),
        pipelineStats: pipelineStats(),
        workItemTypes: mergedResults.workItemTypes
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
