import { TopLevelIndicator } from '../../shared-types';
import {
  Build, CodeCoverageData, CodeCoverageSummary, TestRun
} from '../azure-types';
import { withOverallRating } from './ratings';

type TestStats = {
  success: number,
  failure: number,
  total: number,
  executionTime: number
};

type TestStatsWithBuild = TestStats & { buildName: string, coverage: number };

const defaultStat: TestStats = {
  success: 0, failure: 0, executionTime: 0, total: 0
};

const topLevelIndicator = (stats: TestStatsWithBuild[]): TopLevelIndicator => withOverallRating({
  name: 'Tests',
  count: stats.reduce((acc, s) => acc + s.total, 0),
  indicators: stats.flatMap(stat => [
    {
      name: 'Build pipeline',
      value: stat.buildName,
      rating: 0
    },
    {
      name: 'Successful tests',
      value: stat.success,
      rating: 0 // ratingConfig.coverage.successfulTests(stat.success)
    },
    {
      name: 'Failed tests',
      value: stat.failure,
      rating: 0 // ratingConfig.coverage.failedTests(stat.failure)
    },
    {
      name: 'Tests execution time',
      value: Math.round(stat.executionTime / 1000),
      rating: 0 // ratingConfig.coverage.testExecutionTime(stat.executionTime)
    },
    {
      name: 'Branch coverage',
      value: stat.coverage === 0 ? 0 : `${Math.round(stat.coverage)}%`,
      rating: 0 // ratingConfig.coverage.branchCoverage(stat.coverage)
    }
  ])
});

const getBranchStats = (coverageData: CodeCoverageData[]) => coverageData[0]
  .coverageStats.find(s => s.label === 'Branch');

const coverageFrom = (coverageData?: CodeCoverageData[]) => {
  if (!coverageData?.length) return 0;

  const branchStats = getBranchStats(coverageData);
  if (!branchStats) return 0;
  if (branchStats.total === 0) return 0;
  return (branchStats.covered * 100) / branchStats.total;
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

export default (testRuns: TestRun[]) => {
  const runsByBuildId = testRuns.reduce((acc, run) => {
    if (!run.build) return acc;
    return {
      ...acc,
      [Number(run.build.id)]: [...(acc[Number(run.build.id)] || []), run]
    };
  }, {} as Record<number, TestRun[]>);

  return (
    latestMasterBuildIds: (repoId?: string) => Build[],
    testCoverageByBuildId: (t: number) => Promise<CodeCoverageSummary>
  ) => async (repoId?: string) => {
    const matchingBuilds = latestMasterBuildIds(repoId);

    if (matchingBuilds.length === 0) {
      return topLevelIndicator([{
        buildName: 'No builds',
        total: 0,
        coverage: 0,
        executionTime: 0,
        failure: 0,
        success: 0
      }]);
    }

    return topLevelIndicator(await Promise.all(matchingBuilds.map(async build => ({
      buildName: build.definition.name,
      ...aggregateRuns(runsByBuildId[build.id] || []),
      coverage: coverageFrom((await testCoverageByBuildId(build.id)).coverageData)
    }))));
  };
};
