import type { PipelineStage } from 'mongoose';
import { last, multiply, prop, range } from 'rambda';
import { asc, byNum, desc } from 'sort-lib';
import { z } from 'zod';
import { inDateRange } from './helpers.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import type { BranchCoverage } from './tests-coverages.js';
import {
  getTestsForBuildIds,
  getCoverageForBuildIDs,
  getMainBranchBuildIds,
  queryForFinishTimeInRange,
  getCoveragesForRepo,
  getOneOldCoverageForBuildDefID,
  getOneOldTestForBuildDefID,
  getTestsForRepo,
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

export const combineTestsAndCoverageForRepo = async (
  queryContext: QueryContext,
  repositoryId: string
) => {
  const { collectionName, project } = fromContext(queryContext);

  const [definitionList, definitionTestRuns, branchCoverage] = await Promise.all([
    getDefinitionListWithRepoInfo(collectionName, project, [repositoryId]),
    getTestsForRepo(queryContext, repositoryId),
    getCoveragesForRepo(queryContext, repositoryId),
  ]);

  // Mapping the build definitions/pipelines with no testruns
  const buildDefsWithTests: BuildDefWithTests[] = (definitionList as BuildDef[]).map(
    definition => {
      const tests = definitionTestRuns.find(def => def.definitionId === definition.id);
      return { ...definition, ...tests } || definition;
    }
  );

  return (buildDefsWithTests as BuildDefWithTests[]).map(definition => {
    const coverage = branchCoverage.find(def => def.definitionId === definition.id);
    return (
      coverage ? { ...definition, coverageByWeek: coverage.coverageByWeek } : definition
    ) as BuildDefWithTestsAndCoverage;
  });
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

  // Mapping the build definitions/pipelines with no testruns
  const buildDefsWithTests: BuildDefWithTests[] = (definitionList as BuildDef[]).map(
    definition => {
      const tests = definitionTestRuns.find(def => def.definitionId === definition.id);
      return { ...definition, ...tests } || definition;
    }
  );

  return (buildDefsWithTests as BuildDefWithTests[]).map(definition => {
    const coverage = branchCoverage.find(def => def.definitionId === definition.id);
    return (
      coverage ? { ...definition, coverageByWeek: coverage.coverageByWeek } : definition
    ) as BuildDefWithTestsAndCoverage;
  });
};

export const getTestRunsAndCoverageForRepo = async ({
  queryContext,
  repositoryId,
}: z.infer<typeof testRunsForRepositoryInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const testRunsAndCoverageForRepo = await combineTestsAndCoverageForRepo(
    queryContext,
    repositoryId
  );
  const getOneOlderTestRunForDef = (defId: number) => () => {
    return getOneOldTestForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const getOneOlderCoverageForDef = (defId: number) => () => {
    return getOneOldCoverageForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const definitionTestsAndCoverage = await Promise.all(
    testRunsAndCoverageForRepo.map(async def => {
      const tests = await makeContinuous(
        def.tests,
        startDate,
        endDate,
        getOneOlderTestRunForDef(def.id),
        { hasTests: false }
      );

      const coverageData = await makeContinuous(
        def.coverageByWeek || undefined,
        startDate,
        endDate,
        getOneOlderCoverageForDef(def.id),
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
  );

  return definitionTestsAndCoverage.sort(
    desc(byNum(x => (x.latestTest?.hasTests ? x.latestTest.totalTests : 0)))
  );
};

export const getTestsAndCoverageForRepos = async (
  queryContext: QueryContext,
  searchTerms?: string[],
  teams?: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const activeRepos = await getActiveRepos(queryContext, searchTerms, teams);
  const repositoryIds = activeRepos.map(prop('id'));
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
          def.repositoryId
            ? getOneOlderTestRunForDef(def.id, def.repositoryId)
            : () => Promise.resolve(null),
          { hasTests: false }
        );

        const coverageData = await makeContinuous(
          def.coverageByWeek || undefined,
          startDate,
          endDate,
          def.repositoryId
            ? getOneOlderCoverageForDef(def.id, def.repositoryId)
            : () => Promise.resolve(null),
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
  repoIds?: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const getMainBranchBuildIdsStage: PipelineStage[] = [
    {
      $match: {
        collectionName,
        'project.name': project,
        ...(repoIds ? { id: { $in: repoIds } } : {}),
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
            $sort: {
              finishTime: -1,
            },
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
    { $unwind: { path: '$build' } },
  ];

  const [totalDefs, defsWithTests, defsWithCoverage] = await Promise.all([
    BuildDefinitionModel.find({
      collectionName,
      project,
      repositoryId: { $in: repoIds },
    }).count(),

    RepositoryModel.aggregate<{ count: number; reposCount: number }>([
      ...getMainBranchBuildIdsStage,
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
      ...getMainBranchBuildIdsStage,
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

export const getTestsByWeek = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const [testrunsForAllDefs, definitionList] = await Promise.all([
    RepositoryModel.aggregate<TestsForDef>([
      ...getMainBranchBuildIds(
        collectionName,
        project,
        repositoryIds,
        startDate,
        queryForFinishTimeInRange(startDate, endDate)
      ),
      ...getTestsForBuildIds(collectionName, project),
      {
        $group: {
          _id: '$definitionId',
          repositoryId: { $first: '$repositoryId' },
          definitionId: { $first: '$definitionId' },
          tests: { $push: '$$ROOT' },
        },
      },
    ]),
    getDefinitionListWithRepoInfo(collectionName, project, repositoryIds),
  ]);

  const buildDefsWithTests: BuildDefWithTests[] = (definitionList as BuildDef[]).map(
    definition => {
      const tests = testrunsForAllDefs.find(def => def.definitionId === definition.id);
      return { ...definition, ...tests } || definition;
    }
  );

  // TODO: Fixing n+1 Problem of fetching older testruns
  // def IDs where tests array do not have element with weekIndex 0
  // const defsWithoutTests = testrunsForAllDefs.filter(
  //   def => !def.tests.some(test => test.weekIndex === 0)
  // );

  const getOneOlderTestRunForDef = (defId: number, repositoryId: string) => () => {
    return getOneOldTestForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const weeklyDefinitionTests = await Promise.all(
    buildDefsWithTests.map(async def => {
      const tests = await makeContinuous(
        def.tests,
        startDate,
        endDate,
        getOneOlderTestRunForDef(def.id, def.repositoryId),
        { hasTests: false }
      );

      return {
        ...def,
        tests: tests ? tests.sort(asc(byNum(prop('weekIndex')))) : tests,
        latestTest: tests ? getLatest(tests || []) : null,
      };
    })
  );

  const flatWeeklyDefinitionTests = weeklyDefinitionTests.flatMap(data => {
    return data.tests || [];
  });

  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);

  const testsByWeek = range(0, numberOfIntervals).map(weekIndex => {
    const matchingTests = flatWeeklyDefinitionTests.filter(
      def => def.weekIndex === weekIndex
    );

    const totalTests = matchingTests.reduce((acc, curr) => {
      return acc + (curr.hasTests ? curr.totalTests : 0);
    }, 0);

    const passedTests = matchingTests.reduce((acc, curr) => {
      return acc + (curr.hasTests ? curr.passedTests : 0);
    }, 0);

    return {
      weekIndex,
      passedTests,
      totalTests,
    };
  });

  return testsByWeek.slice(numberOfIntervals - Math.floor(numberOfDays / 7));
};

export const getCoveragesByWeek = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const [coverageForAllDefs, definitionList] = await Promise.all([
    RepositoryModel.aggregate<BranchCoverage>([
      ...getMainBranchBuildIds(
        collectionName,
        project,
        repositoryIds,
        startDate,
        queryForFinishTimeInRange(startDate, endDate)
      ),
      ...getCoverageForBuildIDs(collectionName, project),
      {
        $group: {
          _id: '$definitionId',
          definitionId: { $first: '$definitionId' },
          repositoryId: { $first: '$repositoryId' },
          coverage: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          definitionId: 1,
          repositoryId: 1,
          coverageByWeek: '$coverage',
        },
      },
    ]),
    getDefinitionListWithRepoInfo(collectionName, project, repositoryIds),
  ]);

  const buildDefsWithCoverage: BuildDefWithCoverage[] = (
    definitionList as BuildDef[]
  ).map(definition => {
    const tests = coverageForAllDefs.find(def => def.definitionId === definition.id);
    return { ...definition, ...tests } || definition;
  });

  // TODO: Fixing n+1 Problem of fetching older coverage
  // def IDs where coverageByWeek array do not have element with weekIndex 0
  // const defsWithoutCoverage = coverageForAllDefs.filter(
  //   def => !def.coverageByWeek.some(coverage => coverage.weekIndex === 0)
  // );

  const getOneOlderCoverageForDef = (defId: number, repositoryId: string) => () => {
    return getOneOldCoverageForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const weeklyDefinitionCoverage = await Promise.all(
    buildDefsWithCoverage.map(async def => {
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

      return {
        ...def,
        coverageByWeek: coverageData,
        latestCoverage: coverageData ? last(coverageData) : null,
      };
    })
  );

  const flatWeeklyDefinitionCoverage = weeklyDefinitionCoverage.flatMap(data => {
    return data.coverageByWeek || [];
  });

  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);
  const coverageByWeek = range(0, numberOfIntervals).map(weekIndex => {
    const matchingCoverage = flatWeeklyDefinitionCoverage.filter(
      def => def.weekIndex === weekIndex
    );

    const coveredBranches = matchingCoverage.reduce((acc, curr) => {
      return acc + (curr.coverage ? curr.coverage.coveredBranches : 0);
    }, 0);

    const totalBranches = matchingCoverage.reduce((acc, curr) => {
      return acc + (curr.coverage ? curr.coverage.totalBranches : 0);
    }, 0);

    return {
      weekIndex,
      coveredBranches,
      totalBranches,
    };
  });

  return coverageByWeek.slice(numberOfIntervals - Math.floor(numberOfDays / 7));
};

export const getTotalTestsForRepositoryIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const [testsFromDefsOfRepoIds, definitionList] = await Promise.all([
    RepositoryModel.aggregate<TestsForDef>([
      ...getMainBranchBuildIds(
        collectionName,
        project,
        repositoryIds,
        startDate,
        queryForFinishTimeInRange(startDate, endDate)
      ),
      ...getTestsForBuildIds(collectionName, project),
      {
        $group: {
          _id: '$definitionId',
          id: { $first: '$definitionId' },
          repositoryId: { $first: '$repositoryId' },
          repositoryName: { $first: '$repositoryName' },
          repositoryUrl: { $first: '$repositoryUrl' },
          tests: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          id: 1,
          repositoryId: 1,
          repositoryName: 1,
          repositoryUrl: 1,
          tests: 1,
        },
      },
    ]),
    getDefinitionListWithRepoInfo(collectionName, project, repositoryIds),
  ]);

  const buildDefsWithTests: BuildDefWithTests[] = (definitionList as BuildDef[]).map(
    definition => {
      const tests = testsFromDefsOfRepoIds.find(
        def => def.definitionId === definition.id
      );
      return { ...definition, ...tests } || definition;
    }
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

export const getReposSortedByTests = async (
  queryContext: QueryContext,
  repositoryIds: string[],
  sortOrder: 'asc' | 'desc',
  pageSize: number,
  pageNumber: number
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const testrunsForAllDefs = await RepositoryModel.aggregate<TestsForDef>([
    ...getMainBranchBuildIds(
      collectionName,
      project,
      repositoryIds,
      startDate,
      queryForFinishTimeInRange(startDate, endDate)
    ),
    ...getTestsForBuildIds(collectionName, project),
    {
      $group: {
        _id: '$definitionId',
        repositoryId: { $first: '$repositoryId' },
        definitionId: { $first: '$definitionId' },
        tests: { $push: '$$ROOT' },
      },
    },
  ]);

  const getOneOlderTestRunForDef = (defId: number, repositoryId: string) => () => {
    return getOneOldTestForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const latestDefinitionTests = await Promise.all(
    testrunsForAllDefs.map(async def => {
      const tests = await makeContinuous(
        def.tests,
        startDate,
        endDate,
        getOneOlderTestRunForDef(def.definitionId, def.repositoryId),
        { hasTests: false }
      );
      return {
        ...def,
        latestTest: tests ? getLatest(tests || []) : null,
      };
    })
  );

  const allRepos = latestDefinitionTests
    .reduce<{ repositoryId: string; totalTests: number }[]>((acc, curr) => {
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
    }, [])
    .sort(desc(byNum(repo => repo.totalTests)));

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
