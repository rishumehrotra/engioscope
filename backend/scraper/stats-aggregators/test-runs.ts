import prettyMs from 'pretty-ms';
import {
  equals, head, isNil, last, pipe, prop, T
} from 'rambda';
import { count, incrementBy } from '../../../shared/reducer-utils';
import { asc, byDate, desc } from '../../../shared/sort-utils';
import type { UITests, UIPipelineTest } from '../../../shared/types';
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

const extrapolateIfNeeded = async <T>(
  valuesByWeek: T[],
  historicalCount: () => Promise<T>,
  isEmpty: (value: T) => boolean,
  emptyValue: T
) => {
  const historical = await (isEmpty(valuesByWeek[0]) ? historicalCount() : emptyValue);

  return valuesByWeek.reduce<T[]>((acc, val, index) => {
    if (!isEmpty(val)) {
      acc.push(val);
      return acc;
    }

    // val is empty
    if (index === 0) {
      // No past data to extrapolate from
      acc.push(historical);
      return acc;
    }

    // val is empty, and this isn't the 0th week
    // Extrapolate from previous week
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    acc.push(last(acc)!);
    return acc;
  }, []);
};

const getMasterBuilds = (allMasterBuilds: Record<string, Record<number, Build[] | undefined>>) => (
  (repoId?: string) => (repoId ? (allMasterBuilds[repoId] || {}) : [])
);

const getDefinitionIdsWithoutBuildsInFirstWeek = (
  allMasterBuilds: Record<string, Record<number, Build[] | undefined>>
) => {
  const masterBuilds = getMasterBuilds(allMasterBuilds);

  return unique(
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
};

const historicalStatCollector = (
  allMasterBuilds: Record<string, Record<number, Build[] | undefined>>,
  getOneBuildBeforeQueryPeriod: (buildDefinitionIds: number[]) => Promise<Build[]>
) => {
  const buildsBeforeQueryPeriod = getOneBuildBeforeQueryPeriod(
    getDefinitionIdsWithoutBuildsInFirstWeek(allMasterBuilds)
  );

  return <T, U>(
    statByBuild: (build: Build) => Promise<T>,
    aggregator: (runs: T) => U
  ) => {
    const pBuildsByDefinitionIdBeforeQueryPeriod = buildsBeforeQueryPeriod
      .then(builds => Promise.all(builds.map(async b => [b.definition.id, await statByBuild(b)] as const)))
      .then(x => Object.fromEntries(x));

    return async (buildDefinitionId: number) => {
      const runsByDefinitionId = await pBuildsByDefinitionIdBeforeQueryPeriod;
      const runs = runsByDefinitionId[buildDefinitionId];
      return aggregator(runs);
    };
  };
};

export default (
  testRunsByBuild: (build: Build) => Promise<TestRun[]>,
  testCoverageByBuildId: (t: number) => Promise<CodeCoverageSummary>,
  getOneBuildBeforeQueryPeriod: (buildDefinitionIds: number[]) => Promise<Build[]>,
  allMasterBuilds: Record<string, Record<number, Build[] | undefined>>
) => {
  const masterBuilds = getMasterBuilds(allMasterBuilds);
  const collectHistoricalStat = historicalStatCollector(
    allMasterBuilds,
    getOneBuildBeforeQueryPeriod
  );
  const historicalTestCountByBuildId = collectHistoricalStat(
    testRunsByBuild,
    runs => (runs ? count<TestRun>(incrementBy(prop('totalTests')))(runs) : 0)
  );

  const historicalCoverageByBuildId = collectHistoricalStat(
    pipe(prop('id'), testCoverageByBuildId),
    coverage => {
      if (!coverage) return null;
      return coverageFrom(coverage.coverageData);
    }
  );

  return async (repoId?: string): Promise<UITests> => {
    const matchingBuilds = latestBuilds(masterBuilds(repoId))(T);

    if (matchingBuilds.length === 0) return null;

    const latestBuildsInEachWeek = weeks.map(latestBuilds(masterBuilds(repoId)));

    const interestingBuilds = [...new Set([
      ...matchingBuilds,
      ...latestBuildsInEachWeek.flat()
    ])];

    const [testRunsByBuildIds, testCoverageByBuildIds] = await Promise.all([
      Promise.all(
        interestingBuilds.map(async b => [b.id, await testRunsByBuild(b)] as const)
      ).then(x => Object.fromEntries(x)),
      Promise.all(
        interestingBuilds.map(async b => [b.id, await testCoverageByBuildId(b.id)] as const)
      ).then(x => Object.fromEntries(x))
    ]);

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
        coverage: coverageFrom(coverage.coverageData),
        coverageByWeek: latestBuildsInEachWeek.map(
          builds => builds.flat()
            .filter(b => b.definition.id === build.definition.id)
            .map(b => testCoverageByBuildIds[b.id])
            .reduce<ReturnType<typeof coverageFrom>>((acc, coverage) => {
              const coverageData = coverageFrom(coverage.coverageData);
              if (coverageData === null) return acc;
              if (acc === null) return coverageData;

              return {
                covered: acc.covered + coverageData.covered,
                total: acc.total + coverageData.total
              };
            }, null)
        )
      };
    });

    if (testStats.length === 0) return null;

    return Promise.all(
      testStats
        .filter(stat => stat.success + stat.failure !== 0)
        .map<Promise<UIPipelineTest>>(async stat => ({
          name: stat.buildName,
          id: stat.buildDefinitionId,
          url: stat.url,
          successful: stat.success,
          failed: stat.failure,
          executionTime: prettyMs(stat.executionTime),
          testsByWeek: await extrapolateIfNeeded(
            stat.testsByWeek,
            () => historicalTestCountByBuildId(stat.buildDefinitionId),
            equals(0),
            0
          ),
          coverageByWeek: stat.coverageByWeek.every(isNil)
            ? null
            : await extrapolateIfNeeded(
              stat.coverageByWeek,
              () => historicalCoverageByBuildId(stat.buildDefinitionId),
              isNil,
              null
            ),
          coverage: stat.coverage
        }))
    );
  };
};
