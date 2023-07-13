import { last, multiply, prop, range } from 'rambda';
import { asc, byNum, desc } from 'sort-lib';
import { z } from 'zod';
import { inDateRange } from './helpers.js';
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
import { createIntervals, getLatest } from '../utils.js';
import type { filteredReposInputParser } from './active-repos.js';
import { getActiveRepos } from './active-repos.js';
import { divide } from '../../shared/utils.js';
import { getDefinitionListWithRepoInfo } from './build-definitions.js';

export const testRunsForRepositoryInputParser = z.object({
  queryContext: queryContextInputParser,
  repositoryId: z.string(),
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

export type BuildDefWithTests = BuildDef & Partial<TestsForDef>;

export type BuildDefWithCoverage = BuildDef & Partial<BranchCoverage>;

export type BuildDefWithTestsAndCoverage = BuildDef &
  Partial<TestsForDef> &
  Partial<BranchCoverage>;

export const makeContinuous = async <T extends { weekIndex: number }>(
  unsortedDataByWeek: T[] | undefined,
  startDate: Date,
  endDate: Date,
  getOneOlderTestRun: () => Promise<T | null>,
  emptyValue: Omit<T, 'weekIndex'>
) => {
  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);
  const sortedDataByWeek = unsortedDataByWeek
    ? [...unsortedDataByWeek].sort(byNum(prop('weekIndex')))
    : undefined;

  if (!sortedDataByWeek) {
    const olderTest = await getOneOlderTestRun();
    if (!olderTest) return null;

    return range(0, numberOfIntervals)
      .map(weekIndex => {
        return { ...olderTest, weekIndex };
      })
      .slice(numberOfIntervals - Math.floor(numberOfDays / 7));
  }

  return range(0, numberOfIntervals)
    .reduce<Promise<T[]>>(async (acc, weekIndex, index) => {
      const matchingTest = sortedDataByWeek.find(t => t.weekIndex === weekIndex);

      if (matchingTest) return [...(await acc), matchingTest];

      if (index === 0) {
        const olderTest = await getOneOlderTestRun();

        if (!olderTest) {
          return [{ ...emptyValue, weekIndex } as T];
        }

        return [{ ...olderTest, weekIndex }];
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lastItem = last(await acc)!;
      return [...(await acc), { ...lastItem, weekIndex }];
    }, Promise.resolve([]))
    .then(list => list.slice(numberOfIntervals - Math.floor(numberOfDays / 7)))
    .then(x => x?.sort(byNum(prop('weekIndex'))));
};

const testsByRepositoryId = async (
  queryContext: QueryContext,
  definitionList: BuildDef[],
  testsFromDefsOfRepoIds: TestsForDef[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const buildDefsWithTests: BuildDefWithTests[] = definitionList.map(definition => {
    const tests = testsFromDefsOfRepoIds.find(def => def.definitionId === definition.id);
    return { ...definition, ...tests } || definition;
  });

  const getOneOlderTestRunForDef = (defId: number, repositoryId: string) => () => {
    return getOneOldTestForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const definitionTests = await Promise.all(
    buildDefsWithTests.map(async def => {
      const tests = await makeContinuous(
        def.tests,
        startDate,
        endDate,
        getOneOlderTestRunForDef(def.id, def.repositoryId),
        { hasTests: false }
      );

      const latestTest = tests ? getLatest(tests || []) : null;

      return {
        ...def,
        latestTest,
      };
    })
  );

  return definitionTests.reduce<{ repositoryId: string; totalTests: number }[]>(
    (acc, curr) => {
      const matchingRepo = acc.find(repo => repo.repositoryId === curr.repositoryId);

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

export const combineTestsAndCoverageForRepos = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  const [definitionList, definitionTestRuns, branchCoverage] = await Promise.all([
    getDefinitionListWithRepoInfo(collectionName, project, repositoryIds),
    getTestsForRepos(queryContext, repositoryIds),
    getCoveragesForRepos(queryContext, repositoryIds),
  ]);

  const buildDefsWithTests: BuildDefWithTests[] = definitionList.map(definition => {
    const tests = definitionTestRuns.find(def => def.definitionId === definition.id);
    return { ...definition, ...tests } || definition;
  });

  return buildDefsWithTests.map(definition => {
    const coverage = branchCoverage.find(def => def.definitionId === definition.id);
    return (
      coverage ? { ...definition, coverageByWeek: coverage.coverageByWeek } : definition
    ) as BuildDefWithTestsAndCoverage;
  });
};

export const getTestsAndCoverageForRepoIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const testRunsAndCoverageForRepo = await combineTestsAndCoverageForRepos(
    queryContext,
    repositoryIds
  );
  const getOneOlderTestRunForDef = (defId: number, repositoryId: string) => () => {
    return getOneOldTestForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const getOneOlderCoverageForDef = (defId: number, repositoryId: string) => () => {
    return getOneOldCoverageForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  return (
    await Promise.all(
      testRunsAndCoverageForRepo.map(async def => {
        const tests = await makeContinuous(
          def.tests,
          startDate,
          endDate,
          getOneOlderTestRunForDef(def.id, def.repositoryId),
          { hasTests: false }
        );

        const coverageData = await makeContinuous(
          def.coverageByWeek || undefined,
          startDate,
          endDate,
          getOneOlderCoverageForDef(def.id, def.repositoryId),
          {
            buildId: 0,
            definitionId: 0,
            hasCoverage: false,
          }
        );

        const latestTest = tests ? getLatest(tests || []) : null;
        const latestCoverage = coverageData ? getLatest(coverageData || []) : null;

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
          latestCoverage,
        };
      })
    )
  ).sort(desc(byNum(x => (x.latestTest?.hasTests ? x.latestTest.totalTests : 0))));
};

export const getTestsAndCoverageForRepos = async (
  queryContext: QueryContext,
  searchTerms?: string[],
  teams?: string[]
) => {
  const activeRepos = await getActiveRepos(queryContext, searchTerms, teams);
  return getTestsAndCoverageForRepoIds(queryContext, activeRepos.map(prop('id')));
};

export const getTestRunsAndCoverageForRepo = async ({
  queryContext,
  repositoryId,
}: z.infer<typeof testRunsForRepositoryInputParser>) => {
  return getTestsAndCoverageForRepoIds(queryContext, [repositoryId]);
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

    const repo = acc.find(x => x.repositoryId === repositoryId);
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
  const pipelineTestsAndCoverage = await getTestsAndCoverageForRepos(
    queryContext,
    searchTerms,
    teams
  );

  return pipelineTestsAndCoverage.map(x => {
    return {
      pipelineUrl: x.url,
      pipelineName: x.name,
      repositoryName: x.repositoryName,
      repositoryUrl: x.repositoryUrl,
      totalTests: x.latestTest?.hasTests ? x.latestTest.totalTests : 0,
      totalCoverage: x.latestCoverage?.hasCoverage
        ? divide(
            x.latestCoverage.coverage?.coveredBranches || 0,
            x.latestCoverage.coverage?.totalBranches || 0
          )
            .map(multiply(100))
            .getOr(0)
        : 0,
      failedTests: x.latestTest?.hasTests
        ? x.latestTest.totalTests - x.latestTest.passedTests
        : 0,
      passedTests: x.latestTest?.hasTests ? x.latestTest.passedTests : 0,
    };
  });
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
        collectionName,
        project,
        repoIds,
        startDate,
        queryForFinishTimeInRange(startDate, endDate),
        false
      ),
      {
        $lookup: {
          from: 'testruns',
          let: {
            buildId: '$build.buildId',
          },
          pipeline: [
            {
              $match: {
                collectionName,
                'project.name': project,
                '$expr': { $eq: ['$buildConfiguration.id', '$$buildId'] },
                'release': { $exists: false },
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
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
        collectionName,
        project,
        repoIds,
        startDate,
        queryForFinishTimeInRange(startDate, endDate),
        false
      ),
      {
        $lookup: {
          from: 'codecoverages',
          let: {
            buildId: '$build.buildId',
          },
          pipeline: [
            {
              $match: {
                collectionName,
                project,
                '$expr': {
                  $eq: ['$build.id', '$$buildId'],
                },
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

export const getTestsAndCoverageByWeek = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const result = await getTestsAndCoverageForRepoIds(queryContext, repositoryIds);

  const testsMapByWeekIndex = result.reduce((acc, r) => {
    return (
      r.tests?.reduce((acc, t) => {
        const forWeekIndex = acc.get(t.weekIndex) || {
          passedTests: 0,
          totalTests: 0,
        };

        forWeekIndex.passedTests += t.hasTests ? t.passedTests : 0;
        forWeekIndex.totalTests += t.hasTests ? t.totalTests : 0;

        acc.set(t.weekIndex, forWeekIndex);
        return acc;
      }, acc) || acc
    );
  }, new Map<number, { passedTests: number; totalTests: number }>());

  const testsByWeek = [...testsMapByWeekIndex.entries()].map(
    ([weekIndex, testCounts]) => ({
      weekIndex,
      ...testCounts,
    })
  );

  const coveragesMapByWeekIndex = result.reduce((acc, r) => {
    return (
      r.coverageByWeek?.reduce((acc, c) => {
        const forWeekIndex = acc.get(c.weekIndex) || {
          coveredBranches: 0,
          totalBranches: 0,
        };

        forWeekIndex.coveredBranches += c.hasCoverage
          ? c.coverage?.coveredBranches || 0
          : 0;
        forWeekIndex.totalBranches += c.hasCoverage ? c.coverage?.totalBranches || 0 : 0;

        acc.set(c.weekIndex, forWeekIndex);
        return acc;
      }, acc) || acc
    );
  }, new Map<number, { coveredBranches: number; totalBranches: number }>());

  const coveragesByWeek = [...coveragesMapByWeekIndex.entries()].map(
    ([weekIndex, coverageCounts]) => ({
      weekIndex,
      ...coverageCounts,
    })
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
  const { collectionName, project } = fromContext(queryContext);
  const [testrunsForAllDefs, definitionList] = await Promise.all([
    getTestsForRepos(queryContext, repositoryIds),
    getDefinitionListWithRepoInfo(collectionName, project, repositoryIds),
  ]);

  const allRepos = await testsByRepositoryId(
    queryContext,
    definitionList,
    testrunsForAllDefs
  ).then(x => x.sort(desc(byNum(repo => repo.totalTests))));

  const sortedRepos = sortOrder === 'asc' ? allRepos.reverse() : allRepos;

  return sortedRepos.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
};

export const getDailyTestsForRepositoryId = async (
  queryContext: QueryContext,
  repositoryId: string
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return RepositoryModel.aggregate([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': repositoryId,
        'defaultBranch': { $exists: true },
      },
    },
    {
      $project: {
        _id: 0,
        collectionName: '$collectionName',
        project: '$project.name',
        repositoryId: '$id',
        repositoryName: '$name',
        defaultBranch: '$defaultBranch',
      },
    },
    {
      $lookup: {
        from: 'builds',
        let: {
          repositoryId: '$repositoryId',
          defaultBranch: '$defaultBranch',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repository.id', '$$repositoryId'] },
                  { $eq: ['$sourceBranch', '$$defaultBranch'] },
                  {
                    $or: [
                      { $eq: ['$result', 'failed'] },
                      { $eq: ['$result', 'succeeded'] },
                    ],
                  },
                ],
              },
              finishTime: inDateRange(startDate, endDate),
            },
          },
          {
            $sort: { finishTime: -1 },
          },
          {
            $project: {
              _id: 0,
              buildId: '$id',
              sourceBranch: '$sourceBranch',
              definitionId: '$definition.id',
              definitionName: '$definition.name',
              result: '$result',
              finishTime: '$finishTime',
            },
          },
        ],
        as: 'build',
      },
    },
    {
      $unwind: {
        path: '$build',
      },
    },
    {
      $lookup: {
        from: 'testruns',
        let: {
          buildId: '$build.buildId',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              'project.name': project,
              '$expr': {
                $eq: ['$buildConfiguration.id', '$$buildId'],
              },
            },
          },
        ],
        as: 'tests',
      },
    },
    {
      $unwind: {
        path: '$tests',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: {
          testDate: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$tests.completedDate',
            },
          },
        },
        repositoryId: { $first: '$repositoryId' },
        totalTests: { $sum: '$tests.totalTests' },
      },
    },
    {
      $group: {
        _id: null,
        repositoryId: { $first: '$repositoryId' },
        dailyTests: {
          $push: {
            date: '$_id.testDate',
            totalTests: '$totalTests',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        repositoryId: 1,
        dailyTests: 1,
      },
    },
  ]);
};
