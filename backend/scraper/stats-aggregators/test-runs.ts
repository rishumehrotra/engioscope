import prettyMs from 'pretty-ms';
import {
  head, last, prop, T
} from 'rambda';
import { count, incrementBy } from '../../../shared/reducer-utils';
import { asc, byDate, desc } from '../../../shared/sort-utils';
import type { UITests } from '../../../shared/types';
import { unique, weeks } from '../../utils';
import type {
  Build, CodeCoverageData, CodeCoverageSummary, TestRun
} from '../types-azure';

type TestStats = {
  success: number;
  failure: number;
  total: number;
  executionTime: number;
};

const defaultStat: TestStats = {
  success: 0, failure: 0, executionTime: 0, total: 0
};

const getBranchStats = (coverageData: CodeCoverageData[]) => coverageData[0]
  .coverageStats.find(s => s.label === 'Branch');

const coverageFrom = (coverageData?: CodeCoverageData[]) => {
  if (!coverageData?.length) return null;

  const branchStats = getBranchStats(coverageData);
  if (!branchStats) return null;
  if (branchStats.total === 0) return null;
  return { covered: branchStats.covered, total: branchStats.total };
};

const aggregateRuns = (runs: TestRun[]): TestStats => {
  const testRuns = runs.filter(r => r.startedDate && r.completedDate);
  if (testRuns.length === 0) return defaultStat;

  const minStartTime = testRuns
    .sort(asc(byDate(prop('startedDate'))))[0]
    .startedDate;

  const maxEndTime = testRuns
    .sort(desc(byDate(prop('completedDate'))))[0]
    .completedDate;

  return {
    ...testRuns.reduce((acc, run) => ({
      success: acc.success + run.passedTests,
      failure: acc.failure + (run.totalTests - run.passedTests),
      total: acc.total + run.totalTests
    }), { success: 0, failure: 0, total: 0 }),
    executionTime: maxEndTime.getTime() - minStartTime.getTime()
  };
};

const latestBuilds = (allBuilds: Record<number, Build[] | undefined>) => (
  (inTimeRange: (d: Date) => boolean) => (
    Object.values(allBuilds).reduce<Build[]>((acc, builds) => {
      const latestBuild = head(
        [...(builds || [])]
          .filter(b => inTimeRange(b.startTime))
          .sort(desc(byDate(prop('startTime'))))
      );

      if (latestBuild) acc.push(latestBuild);
      return acc;
    }, [])
  )
);

const extrapolateIfNeeded = async (testRunsByWeek: number[], historicalCount: () => Promise<number>) => {
  const historical = await (testRunsByWeek[0] === 0 ? historicalCount() : 0);
  return (
    testRunsByWeek.reduce<number[]>((acc, runCount, index) => {
      if (runCount !== 0) {
        acc.push(runCount);
        return acc;
      }

      // runCount is 0
      if (index === 0) {
        // No past data to extrapolate from
        acc.push(historical);
        return acc;
      }

      // runCount is 0
      // Extrapolate from previous week
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      acc.push(last(acc)!);
      return acc;
    }, [])
  );
};

const getMasterBuilds = (allMasterBuilds: Record<string, Record<number, Build[] | undefined>>) => (
  (repoId?: string) => (
    (repoId ? (allMasterBuilds[repoId] || {}) : [])
  )
);

const historicalTestCount = (
  allMasterBuilds: Record<string, Record<number, Build[] | undefined>>,
  getOneBuildBeforeQueryPeriod: (buildDefinitionIds: number[]) => Promise<Build[]>,
  testRunsByBuild: (build: Build) => Promise<TestRun[]>
) => {
  const masterBuilds = getMasterBuilds(allMasterBuilds);
  const definitionIdsWithoutBuildsInFirstWeek = unique(
    Object.keys(allMasterBuilds)
      .filter(repoId => latestBuilds(masterBuilds(repoId))(T).length !== 0)
      .map(repoId => {
        const withoutBuilds = Object.entries(masterBuilds(repoId))
          .filter(([, builds]) => (
            (builds || []).filter(b => weeks[0](b.startTime)).length === 0
          ));

        return withoutBuilds.map(([definitionId]) => Number(definitionId));
      })
      .flat()
  );

  const pRunsByDefinitionIdBeforeQueryPeriod = getOneBuildBeforeQueryPeriod(definitionIdsWithoutBuildsInFirstWeek)
    .then(builds => Promise.all(builds.map(async b => [b.definition.id, await testRunsByBuild(b)] as const)))
    .then(x => Object.fromEntries(x));

  return async (buildDefinitionId: number) => {
    const runsByDefinitionId = await pRunsByDefinitionIdBeforeQueryPeriod;
    const runs = runsByDefinitionId[buildDefinitionId];
    return runs ? count<TestRun>(incrementBy(prop('totalTests')))(runs) : 0;
  };
};

export default (
  testRunsByBuild: (build: Build) => Promise<TestRun[]>,
  testCoverageByBuildId: (t: number) => Promise<CodeCoverageSummary>,
  getOneBuildBeforeQueryPeriod: (buildDefinitionIds: number[]) => Promise<Build[]>,
  allMasterBuilds: Record<string, Record<number, Build[] | undefined>>
) => {
  const masterBuilds = getMasterBuilds(allMasterBuilds);
  const historicalTestCountByBuildId = historicalTestCount(
    allMasterBuilds,
    getOneBuildBeforeQueryPeriod,
    testRunsByBuild
  );

  return async (repoId?: string): Promise<UITests> => {
    const matchingBuilds = latestBuilds(masterBuilds(repoId))(T);

    if (matchingBuilds.length === 0) return null;

    const latestBuildsInEachWeek = weeks.map(latestBuilds(masterBuilds(repoId)));

    const interestingBuilds = [...new Set([
      ...matchingBuilds,
      ...latestBuildsInEachWeek.flat()
    ])];

    const testRunsByBuildIds = Object.fromEntries(
      await Promise.all(
        interestingBuilds.map(async b => [b.id, await testRunsByBuild(b)] as const)
      )
    );

    const testCoverageByBuildIds = Object.fromEntries(
      await Promise.all(
        matchingBuilds.map(async b => [b.id, await testCoverageByBuildId(b.id)] as const)
      )
    );

    const testStats = matchingBuilds.map(build => {
      const runs = testRunsByBuildIds[build.id];
      const coverage = testCoverageByBuildIds[build.id];

      return {
        buildName: build.definition.name,
        buildDefinitionId: build.definition.id,
        url: `${build.url.replace('_apis/build/Builds/', '_build/results?buildId=')}&view=ms.vss-test-web.build-test-results-tab`,
        ...aggregateRuns(runs),
        testsByWeek: latestBuildsInEachWeek.map(
          builds => builds.flat()
            .filter(b => b.definition.id === build.definition.id)
            .map(b => testRunsByBuildIds[b.id])
            .reduce(incrementBy(count(incrementBy(prop('totalTests')))), 0)
        ),
        coverage: coverageFrom(coverage.coverageData)
      };
    });

    if (testStats.length === 0) return null;

    return Promise.all(
      testStats
        .filter(stat => stat.success + stat.failure !== 0)
        .map(async stat => ({
          name: stat.buildName,
          id: stat.buildDefinitionId,
          url: stat.url,
          successful: stat.success,
          failed: stat.failure,
          executionTime: prettyMs(stat.executionTime),
          testsByWeek: await extrapolateIfNeeded(stat.testsByWeek, () => historicalTestCountByBuildId(stat.buildDefinitionId)),
          coverage: stat.coverage
        }))
    );
  };
};
