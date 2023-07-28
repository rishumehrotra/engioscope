import { last, multiply, prop, propEq, range, sort } from 'rambda';
import { asc, byNum, desc } from 'sort-lib';
import { z } from 'zod';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import type { BranchCoverage } from './tests-coverages.js';
import {
  getMainBranchBuildIds,
  queryForFinishTimeInRange,
  getOneOldCoverageForBuildDefID,
  getOneOldTestForBuildDefID,
  getTestsForRepos,
  getCoveragesForRepos,
} from './tests-coverages.js';
import type { QueryContext } from './utils.js';
import { queryContextInputParser, fromContext } from './utils.js';
import { createIntervals } from '../utils.js';
import type { filteredReposInputParser } from './active-repos.js';
import { getActiveRepos } from './active-repos.js';
import { divide } from '../../shared/utils.js';
import { getDefinitionListWithRepoInfo } from './build-definitions.js';

export const testRunsForRepositoriesInputParser = z.object({
  queryContext: queryContextInputParser,
  repositoryIds: z.array(z.string()),
});

export type BuildDef = {
  id: number;
  name: string;
  url: string;
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
};

export type TestsForWeek = {
  weekIndex: number;
} & (
  | { hasTests: false }
  | {
      hasTests: true;
      buildId: number;
      totalTests: number;
      startedDate: Date;
      completedDate: Date;
      passedTests: number;
    }
);

export type TestsForDef = {
  definitionId: number;
  buildId: number;
  tests: TestsForWeek[];
  latest?: TestsForWeek;
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
};

type BuildDefWithTests = BuildDef & Partial<TestsForDef>;

type BuildDefWithTestsAndCoverage = BuildDef &
  Partial<TestsForDef> &
  Partial<BranchCoverage>;

const getLatest = <T extends { weekIndex: number }>(weeklyData: T[]) => {
  return weeklyData.sort(desc(byNum(prop('weekIndex'))))[0];
};

const makeContinuous = async <T extends { weekIndex: number }>(
  queryContext: QueryContext,
  unsortedDataByWeek: T[] | undefined,
  getOneOlderItem: (queryContext: QueryContext) => Promise<T | null>,
  emptyValue: Omit<T, 'weekIndex'>
) => {
  const { startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);
  const sortedDataByWeek = unsortedDataByWeek
    ? [...unsortedDataByWeek].sort(byNum(prop('weekIndex')))
    : undefined;

  if (!sortedDataByWeek) {
    const olderTest = await getOneOlderItem(queryContext);
    if (!olderTest) return null;

    return range(0, numberOfIntervals).map(weekIndex => ({ ...olderTest, weekIndex }));
  }

  return range(0, numberOfIntervals)
    .reduce<Promise<T[]>>(async (acc, weekIndex, index) => {
      const matchingTest = sortedDataByWeek.find(propEq('weekIndex', weekIndex));

      if (matchingTest) return [...(await acc), matchingTest];

      if (index === 0) {
        const olderTest = await getOneOlderItem(queryContext);
        return [{ ...(olderTest || emptyValue), weekIndex } as T];
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lastItem = last(await acc)!;
      return [...(await acc), { ...lastItem, weekIndex }];
    }, Promise.resolve([]))
    .then(sort(byNum(prop('weekIndex'))));
};

const mergeBuildDefsAndTests = (
  buildDefinitions: BuildDef[],
  testsForBuildDefs: TestsForDef[]
): BuildDefWithTests[] => {
  return buildDefinitions.map(definition => ({
    ...definition,
    ...testsForBuildDefs.find(propEq('definitionId', definition.id)),
  }));
};

const mergeBuildDefsAndCoverage = (
  buildDefsWithTests: BuildDefWithTests[],
  branchCoverage: BranchCoverage[]
): BuildDefWithTestsAndCoverage[] => {
  return buildDefsWithTests.map(definition => ({
    ...definition,
    coverageByWeek: branchCoverage.find(propEq('definitionId', definition.id))
      ?.coverageByWeek,
  }));
};

const testsByRepositoryId = async (
  queryContext: QueryContext,
  buildDefinitions: BuildDef[],
  testsForBuildDefinitions: TestsForDef[]
) => {
  const buildDefsWithTests = mergeBuildDefsAndTests(
    buildDefinitions,
    testsForBuildDefinitions
  );

  const definitionTests = await Promise.all(
    buildDefsWithTests.map(async def => {
      const tests = await makeContinuous(
        queryContext,
        def.tests,
        getOneOldTestForBuildDefID(def.repositoryId, def.id),
        { hasTests: false }
      );

      return { ...def, latestTest: tests ? getLatest(tests) : null };
    })
  );

  return definitionTests.reduce<{ repositoryId: string; totalTests: number }[]>(
    (acc, curr) => {
      const matchingRepo = acc.find(propEq('repositoryId', curr.repositoryId));

      if (matchingRepo) {
        matchingRepo.totalTests += curr.latestTest?.hasTests
          ? curr.latestTest.totalTests
          : 0;
      } else {
        acc.push({
          repositoryId: curr.repositoryId,
          totalTests: curr.latestTest?.hasTests ? curr.latestTest.totalTests : 0,
        });
      }

      return acc;
    },
    []
  );
};

const combineTestsAndCoverageForRepos = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  const [buildDefinitions, testsForBuildDefinitions, branchCoverage] = await Promise.all([
    getDefinitionListWithRepoInfo(collectionName, project, repositoryIds),
    getTestsForRepos(queryContext, repositoryIds),
    getCoveragesForRepos(queryContext, repositoryIds),
  ]);

  return mergeBuildDefsAndCoverage(
    mergeBuildDefsAndTests(buildDefinitions, testsForBuildDefinitions),
    branchCoverage
  );
};

export const getTestsAndCoverageForRepoIds = async ({
  queryContext,
  repositoryIds,
}: z.infer<typeof testRunsForRepositoriesInputParser>) => {
  const testRunsAndCoverageForRepo = await combineTestsAndCoverageForRepos(
    queryContext,
    repositoryIds
  );

  return Promise.all(
    testRunsAndCoverageForRepo.map(async def => {
      const tests = await makeContinuous(
        queryContext,
        def.tests,
        getOneOldTestForBuildDefID(def.repositoryId, def.id),
        { hasTests: false }
      );

      const coverageData = await makeContinuous(
        queryContext,
        def.coverageByWeek,
        getOneOldCoverageForBuildDefID(def.repositoryId, def.id),
        { hasCoverage: false }
      );

      const latestTest = tests ? getLatest(tests) : null;

      const url = latestTest?.hasTests
        ? `${def.url.split('_apis')[0]}_build/results?buildId=${
            latestTest.buildId
          }&view=ms.vss-test-web.build-test-results-tab`
        : `${def.url.split('_apis')[0]}_build/definition?definitionId=${def.id}`;

      return {
        ...def,
        url,
        tests: tests ? tests.sort(asc(byNum(prop('weekIndex')))) : tests,
        coverageByWeek: coverageData
          ? coverageData.sort(asc(byNum(prop('weekIndex'))))
          : coverageData,
        latestTest,
        latestCoverage: coverageData ? getLatest(coverageData) : null,
      };
    })
  ).then(sort(desc(byNum(x => (x.latestTest?.hasTests ? x.latestTest.totalTests : 0)))));
};

const getTestsAndCoverageForRepos = async (
  queryContext: QueryContext,
  searchTerms?: string[],
  teams?: string[]
) => {
  const activeRepos = await getActiveRepos(queryContext, searchTerms, teams);
  return getTestsAndCoverageForRepoIds({
    queryContext,
    repositoryIds: activeRepos.map(prop('id')),
  });
};

export const getReposListingForTestsDrawer = async ({
  queryContext,
  searchTerms,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const testsAndCoverageForRepos = await getTestsAndCoverageForRepos(
    queryContext,
    searchTerms,
    teams
  );

  return testsAndCoverageForRepos.reduce<
    {
      repositoryId: string;
      repositoryName: string;
      definitions: typeof testsAndCoverageForRepos;
      totalTests: number;
    }[]
  >((acc, curr) => {
    const { repositoryId, latestTest, repositoryName } = curr;

    if (!repositoryId || !repositoryName) return acc;

    const repo = acc.find(propEq('repositoryId', repositoryId));
    if (repo) {
      repo.definitions.push(curr);
      repo.totalTests += latestTest?.hasTests ? latestTest.totalTests : 0;
    } else {
      acc.push({
        repositoryId,
        repositoryName,
        definitions: [curr],
        totalTests: latestTest?.hasTests ? latestTest.totalTests : 0,
      });
    }

    return acc;
  }, []);
};

export const getTestsAndCoveragePipelinesForDownload = async ({
  queryContext,
  searchTerms,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const testsAndCoverageForRepos = await getTestsAndCoverageForRepos(
    queryContext,
    searchTerms,
    teams
  );

  return testsAndCoverageForRepos.map(x => ({
    pipelineUrl: x.url,
    pipelineName: x.name,
    repositoryName: x.repositoryName,
    repositoryUrl: x.repositoryUrl,
    totalTests: x.latestTest?.hasTests ? x.latestTest.totalTests : 0,
    totalCoverage: x.latestCoverage?.hasCoverage
      ? divide(
          x.latestCoverage.coverage.coveredBranches,
          x.latestCoverage.coverage.totalBranches
        )
          .map(multiply(100))
          .getOr(0)
      : 0,
    failedTests: x.latestTest?.hasTests
      ? x.latestTest.totalTests - x.latestTest.passedTests
      : 0,
    passedTests: x.latestTest?.hasTests ? x.latestTest.passedTests : 0,
  }));
};

export const getTestsAndCoveragesCount = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const [totalDefs, defsWithTests, defsWithCoverage] = await Promise.all([
    BuildDefinitionModel.find({
      collectionName,
      project,
      repositoryId: { $in: repoIds },
    }).count(),

    RepositoryModel.aggregate<{ count: number; reposCount: number }>([
      ...getMainBranchBuildIds(
        queryContext,
        repoIds,
        queryForFinishTimeInRange(startDate, endDate),
        false
      ),
      {
        $lookup: {
          from: 'testruns',
          let: { buildId: '$build.buildId' },
          pipeline: [
            {
              $match: {
                collectionName,
                'project.name': project,
                '$expr': { $eq: ['$buildConfiguration.id', '$$buildId'] },
                'release': { $exists: false },
                // NOTE - This is a workaround to make sure we will fetch the testruns,
                // where runStatistics array of object field is not empty.
                // This is happening because Azure itself is not storing the testruns in the database due to some type issue.
                'runStatistics.state': { $exists: true },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: 'tests',
        },
      },
      {
        $project: {
          repositoryId: '$repositoryId',
          definitionId: '$build.definitionId',
          hasTests: { $gt: [{ $size: '$tests' }, 0] },
        },
      },
      { $match: { hasTests: true } },
      {
        $group: {
          _id: null,
          defsWithTests: { $addToSet: '$definitionId' },
          reposWithTests: { $addToSet: '$repositoryId' },
        },
      },
      {
        $project: {
          _id: 0,
          count: { $size: '$defsWithTests' },
          reposCount: { $size: '$reposWithTests' },
        },
      },
    ]),

    RepositoryModel.aggregate<{ count: number; reposCount: number }>([
      ...getMainBranchBuildIds(
        queryContext,
        repoIds,
        queryForFinishTimeInRange(startDate, endDate),
        false
      ),
      {
        $lookup: {
          from: 'codecoverages',
          let: { buildId: '$build.buildId' },
          pipeline: [
            {
              $match: {
                collectionName,
                project,
                '$expr': { $eq: ['$build.id', '$$buildId'] },
                'coverageData.coverageStats.label': { $in: ['Branch', 'Branches'] },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: 'coverage',
        },
      },
      {
        $project: {
          repositoryId: '$repositoryId',
          definitionId: '$build.definitionId',
          hasCoverage: { $gt: [{ $size: '$coverage' }, 0] },
        },
      },
      { $match: { hasCoverage: true } },
      {
        $group: {
          _id: null,
          defsWithCoverage: { $addToSet: '$definitionId' },
          reposWithCoverage: { $addToSet: '$repositoryId' },
        },
      },
      {
        $project: {
          _id: 0,
          count: { $size: '$defsWithCoverage' },
          reposCount: { $size: '$reposWithCoverage' },
        },
      },
    ]),
  ]);

  return {
    totalDefs,
    defsWithTests: defsWithTests[0]?.count || 0,
    defsWithCoverage: defsWithCoverage[0]?.count || 0,
    reposWithTests: defsWithTests[0]?.reposCount || 0,
    reposWithCoverage: defsWithCoverage[0]?.reposCount || 0,
  };
};

const mergeNestedForWeekIndex = <T, U extends { weekIndex: number }, V>(
  list: T[],
  innerList: (x: T) => U[] | undefined | null,
  combiner: (x: V, y: U) => V,
  emptyValue: V
) => {
  const byWeekIndex = list.reduce((acc, item) => {
    const nestedList = innerList(item);

    if (!nestedList) return acc;
    return nestedList.reduce((acc, innerItem) => {
      acc.set(
        innerItem.weekIndex,
        combiner(acc.get(innerItem.weekIndex) || emptyValue, innerItem)
      );
      return acc;
    }, acc);
  }, new Map<number, V>());

  return [...byWeekIndex.entries()]
    .map(([weekIndex, testCounts]) => ({ weekIndex, ...testCounts }))
    .sort(asc(byNum(prop('weekIndex'))));
};

export const getTestsAndCoverageByWeek = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const testsAndCoverage = await getTestsAndCoverageForRepoIds({
    queryContext,
    repositoryIds,
  });

  type PrevTest =
    | { hasTests: false }
    | { hasTests: true; totalTests: number; passedTests: number };

  type PrevCoverage =
    | { hasCoverage: false }
    | { hasCoverage: true; coveredBranches: number; totalBranches: number };

  const testsByWeek = mergeNestedForWeekIndex(
    testsAndCoverage,
    prop('tests'),
    (prev: PrevTest, definition) => ({
      hasTests: prev.hasTests || definition.hasTests,
      passedTests:
        (prev.hasTests ? prev.passedTests : 0) +
        (definition.hasTests ? definition.passedTests : 0),
      totalTests:
        (prev.hasTests ? prev.totalTests : 0) +
        (definition.hasTests ? definition.totalTests : 0),
    }),
    { hasTests: false }
  );

  const coveragesByWeek = mergeNestedForWeekIndex(
    testsAndCoverage,
    prop('coverageByWeek'),
    (prev: PrevCoverage, definition) => ({
      hasCoverage: prev.hasCoverage || definition.hasCoverage,
      coveredBranches:
        (prev.hasCoverage ? prev.coveredBranches : 0) +
        (definition.hasCoverage ? definition.coverage.coveredBranches : 0),
      totalBranches:
        (prev.hasCoverage ? prev.totalBranches : 0) +
        (definition.hasCoverage ? definition.coverage.totalBranches : 0),
    }),
    { hasCoverage: false }
  );

  return { testsByWeek, coveragesByWeek };
};

export const getTotalTestsForRepositoryIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  const [testsFromDefsOfRepoIds, definitionList] = await Promise.all([
    getTestsForRepos(queryContext, repositoryIds),
    getDefinitionListWithRepoInfo(collectionName, project, repositoryIds),
  ]);

  return testsByRepositoryId(queryContext, definitionList, testsFromDefsOfRepoIds);
};

export const getReposSortedByTests = async (
  queryContext: QueryContext,
  repositoryIds: string[],
  sortOrder: 'asc' | 'desc',
  pageSize: number,
  pageNumber: number
) => {
  const allRepos = await getTotalTestsForRepositoryIds(queryContext, repositoryIds).then(
    sort((sortOrder === 'asc' ? asc : desc)(byNum(repo => repo.totalTests)))
  );
  return allRepos.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
};
