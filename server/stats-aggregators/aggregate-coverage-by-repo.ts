/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Build, CodeCoverageData, CodeCoverageSummary, TestRun
} from '../network/azure-types';
import { TopLevelIndicator } from '../../shared-types';
import ratingConfig from '../rating-config';
import { isMaster } from '../utils';
import { withOverallRating } from './ratings';

type TestStats = {
  success: number,
  failure: number,
  executionTime: number
  coverage: number
};

const defaultStat: TestStats = {
  success: 0, failure: 0, executionTime: 0, coverage: 0
};

const topLevelIndicator = (stat: TestStats): TopLevelIndicator => withOverallRating({
  name: 'Tests',
  count: stat.success + stat.failure,
  indicators: [
    {
      name: 'Successful tests',
      value: stat.success,
      rating: ratingConfig.coverage.successfulTests(stat.success)
    },
    {
      name: 'Failed tests',
      value: stat.failure,
      rating: ratingConfig.coverage.failedTests(stat.failure)
    },
    {
      name: 'Tests execution time',
      value: Math.round(stat.executionTime / 1000),
      rating: ratingConfig.coverage.testExecutionTime(stat.executionTime)
    },
    {
      name: 'Branch coverage',
      value: stat.coverage === 0 ? 0 : `${Math.round(stat.coverage)}%`,
      rating: ratingConfig.coverage.branchCoverage(stat.coverage)
    }
  ]
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

const isForMasterOfRepo = (buildByBuildId: (b: number) => Build | undefined, repoId?: string) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  (testRun: TestRun) => {
    const build = buildByBuildId(Number(testRun.build?.id!));
    return build?.repository?.id === repoId && isMaster(build?.sourceBranch!);
  };

export default (
  testRuns: TestRun[],
  buildByBuildId: (b: number) => Build | undefined,
  testCoverageByBuildId: (t: number) => Promise<CodeCoverageSummary>
) => async (repoId?: string): Promise<TopLevelIndicator> => {
  const matchingTestRun = testRuns.find(isForMasterOfRepo(buildByBuildId, repoId));

  if (!matchingTestRun) return topLevelIndicator(defaultStat);
  if (matchingTestRun.totalTests === 0) return topLevelIndicator(defaultStat);

  const { coverageData } = await testCoverageByBuildId(Number(matchingTestRun.build?.id!));

  return topLevelIndicator({
    success: matchingTestRun.passedTests || 0,
    failure: (matchingTestRun.totalTests || 0) - (matchingTestRun.passedTests || 0),
    executionTime: matchingTestRun.completedDate?.getTime()! - matchingTestRun.startedDate?.getTime()!,
    coverage: coverageFrom(coverageData)
  });
};
