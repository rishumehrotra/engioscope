import prettyMs from 'pretty-ms';
import { prop, sum } from 'rambda';
import type { UITests } from '../../../shared/types';
import { unique } from '../../utils';
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

export default (
  testRunsByBuild: (build: Build) => Promise<TestRun[]>,
  testCoverageByBuildId: (t: number) => Promise<CodeCoverageSummary>,
  latestMasterBuilds: (repoId?: string) => Build[]
) => async (repoId?: string): Promise<UITests> => {
  const matchingBuilds = latestMasterBuilds(repoId);

  if (matchingBuilds.length === 0) return null;

  const testStats = (await Promise.all(matchingBuilds.map(async build => {
    const [runs, coverage] = await Promise.all([
      testRunsByBuild(build), testCoverageByBuildId(build.id)
    ]);
    return {
      buildName: build.definition.name,
      url: `${build.url.replace('_apis/build/Builds/', '_build/results?buildId=')}&view=ms.vss-test-web.build-test-results-tab`,
      ...aggregateRuns(runs),
      coverage: coverageFrom(coverage.coverageData)
    };
  })));

  if (testStats.length === 0) return null;

  return {
    total: sum(unique(testStats.map(prop('total')))),
    pipelines: testStats.map(stat => ({
      name: stat.buildName,
      url: stat.url,
      successful: stat.success,
      failed: stat.failure,
      executionTime: prettyMs(stat.executionTime),
      coverage: `${stat.coverage}%`
    }))
  };
};
