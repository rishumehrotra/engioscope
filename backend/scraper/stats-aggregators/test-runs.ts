import prettyMs from 'pretty-ms';
import {
  last, prop, sum, T
} from 'rambda';
import { count, incrementBy } from '../../../shared/reducer-utils';
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
  if (!coverageData?.length) return 0;

  const branchStats = getBranchStats(coverageData);
  if (!branchStats) return 0;
  if (branchStats.total === 0) return 0;
  return Math.round((branchStats.covered * 100) / branchStats.total);
};

const aggregateRuns = (runs: TestRun[]): TestStats => {
  const testRuns = runs.filter(r => r.startedDate && r.completedDate);
  if (testRuns.length === 0) return defaultStat;

  const minStartTime = testRuns
    .sort((a, b) => a.startedDate.getTime() - b.startedDate.getTime())[0]
    .startedDate;

  const maxEndTime = testRuns
    .sort((a, b) => a.completedDate.getTime() - b.completedDate.getTime())[testRuns.length - 1]
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

const latestMasterBuilds = (allMasterBuilds: Record<number, Build[]>, inTimeRange: (d: Date) => boolean = T) => (
  Object.values(allMasterBuilds).reduce((acc, builds) => {
    const latestBuild = [...builds]
      .filter(b => inTimeRange(b.startTime))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
    if (latestBuild) acc.push(latestBuild);
    return acc;
  }, [])
);

const extrapolateIfNeeded = (testRunsByWeek: number[]) => (
  testRunsByWeek.reduce<number[]>((acc, runCount, index) => {
    if (runCount !== 0) {
      acc.push(runCount);
      return acc;
    }

    // runCount is 0

    if (index === 0) {
      // No past data to extrapolate from
      acc.push(0);
      return acc;
    }

    // Extrapolate from previous week
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    acc.push(last(acc)!);
    return acc;
  }, [])
);

export default (
  testRunsByBuild: (build: Build) => Promise<TestRun[]>,
  testCoverageByBuildId: (t: number) => Promise<CodeCoverageSummary>,
  allMasterBuilds: (repoId?: string) => Record<number, Build[]>
) => async (repoId?: string): Promise<UITests> => {
  const matchingBuilds = latestMasterBuilds(allMasterBuilds(repoId));

  if (matchingBuilds.length === 0) return null;

  const latestBuildsInEachWeek = weeks.map(
    isWithinWeek => latestMasterBuilds(allMasterBuilds(repoId), isWithinWeek)
  );

  const interestingBuilds = [...new Set([...matchingBuilds, ...latestBuildsInEachWeek.flat()])];

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

  return {
    total: sum(unique(testStats.map(prop('total')))),
    pipelines: testStats.map(stat => ({
      name: stat.buildName,
      url: stat.url,
      successful: stat.success,
      failed: stat.failure,
      executionTime: prettyMs(stat.executionTime),
      testsByWeek: extrapolateIfNeeded(stat.testsByWeek),
      coverage: `${stat.coverage}%`
    }))
  };
};
