import type { PipelineStage } from 'mongoose';
import { last, range } from 'rambda';
import { byNum, desc } from 'sort-lib';
import { z } from 'zod';
import { oneDayInMs } from '../../shared/utils.js';
import { collectionAndProjectInputs, dateRangeInputs, inDateRange } from './helpers.js';
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
} from './tests-coverages.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';

export type TestStatDetails = {
  state: string;
  outcome: string;
  count: number;
};

export type BuildPipelineTests = {
  _id: number;
  collectionName: string;
  project: string;
  repositoryId: string;
  repositoryName: string;
  defaultBranch: string;
  buildId: number;
  sourceBranch: string;
  definitionId: number;
  definitionName: string;
  definitionUrl: string;
  testDuration: number;
  totalTests: number;
  testStats: TestStatDetails[];
  testsName: string;
};
export const TestRunsForRepositoryInputParser = z.object({
  ...collectionAndProjectInputs,
  repositoryId: z.string(),
  ...dateRangeInputs,
});

export type BuildDef = { id: number; name: string; url: string };

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
};

export type BuildDefWithTests = BuildDef & Partial<TestsForDef>;

export type BuildDefWithTestsAndCoverage = BuildDef &
  Partial<TestsForDef> &
  Partial<BranchCoverage>;

const createIntervals = (startDate: Date, endDate: Date) => {
  const numberOfDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  return {
    numberOfDays,
    numberOfIntervals: Math.floor(numberOfDays / 7 + (numberOfDays % 7 === 0 ? 0 : 1)),
  };
};

export const makeContinuous = async <T extends { weekIndex: number }>(
  tests: T[] | undefined,
  startDate: Date,
  endDate: Date,
  getOneOlderTestRun: () => Promise<T | null>,
  emptyValue: Omit<T, 'weekIndex'>
) => {
  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);

  if (!tests) {
    const olderTest = await getOneOlderTestRun();
    if (!olderTest) return null;

    return range(0, numberOfIntervals).map(weekIndex => {
      return { ...olderTest, weekIndex };
    });
  }

  return range(0, numberOfIntervals)
    .reduce<Promise<T[]>>(async (acc, weekIndex, index) => {
      const matchingTest = tests.find(t => t.weekIndex === weekIndex);

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
    .then(list => list.slice(numberOfIntervals - Math.floor(numberOfDays / 7)));
};

export const mapDefsTestsAndCoverage = async (
  collectionName: string,
  project: string,
  startDate: Date,
  endDate: Date,
  repositoryId: string
) => {
  const [definitionList, definitionTestRuns, branchCoverage] = await Promise.all([
    BuildDefinitionModel.find(
      {
        collectionName,
        project,
        repositoryId,
      },
      {
        _id: 0,
        id: 1,
        name: 1,
        url: 1,
      }
    ).lean(),
    getTestsForRepo(collectionName, project, repositoryId, startDate, endDate),
    getCoveragesForRepo(collectionName, project, repositoryId, startDate, endDate),
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
  collectionName,
  project,
  repositoryId,
  startDate,
  endDate,
}: z.infer<typeof TestRunsForRepositoryInputParser>) => {
  const testRunsAndCoverageForRepo = await mapDefsTestsAndCoverage(
    collectionName,
    project,
    startDate,
    endDate,
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

      const latestTest = tests ? [...tests.reverse()].find(t => t.hasTests) : null;
      const latestCoverage = coverageData
        ? [...coverageData.reverse()].find(t => t.hasCoverage)
        : null;

      const url = latestTest?.hasTests
        ? `${def.url.split('_apis')[0]}_build/results?buildId=${
            latestTest.buildId
          }&view=ms.vss-test-web.build-test-results-tab`
        : `${def.url.split('_apis')[0]}_build/definition?definitionId=${def.id}`;

      return {
        ...def,
        url,
        tests,
        coverageByWeek: coverageData,
        latestTest,
        latestCoverage,
      };
    })
  );

  return definitionTestsAndCoverage.sort(
    desc(byNum(x => (x.latestTest?.hasTests ? x.latestTest.totalTests : 0)))
  );
};

export const getDefinitionsWithTestsAndCoverages = async (
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

    RepositoryModel.aggregate<{ count: number }>([
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
          definitionId: '$build.definitionId',
          hasTests: { $gt: [{ $size: '$tests' }, 0] },
        },
      },
      { $match: { hasTests: true } },
      {
        $group: {
          _id: null,
          defsWithTests: {
            $addToSet: '$definitionId',
          },
        },
      },
      {
        $project: {
          _id: 0,
          count: { $size: '$defsWithTests' },
          defsWithTests: 1,
        },
      },
    ]),

    RepositoryModel.aggregate<{ count: number }>([
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
          definitionId: '$build.definitionId',
          hasCoverage: { $gt: [{ $size: '$coverage' }, 0] },
        },
      },
      { $match: { hasCoverage: true } },
      {
        $group: {
          _id: null,
          defsWithCoverage: {
            $addToSet: '$definitionId',
          },
        },
      },
      {
        $project: {
          _id: 0,
          count: { $size: '$defsWithCoverage' },
        },
      },
    ]),
  ]);

  return {
    totalDefs,
    defsWithTests: defsWithTests[0]?.count || 0,
    defsWithCoverage: defsWithCoverage[0]?.count || 0,
  };
};

export const getTestsByWeek = async (
  queryContext: QueryContext,
  repositoryIds: string[]
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
        tests,
        latestTest: tests ? last(tests) : null,
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
  const coverageForAllDefs = await RepositoryModel.aggregate<BranchCoverage>([
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
  ]);

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
    coverageForAllDefs.map(async def => {
      const coverageData = await makeContinuous(
        def.coverageByWeek || undefined,
        startDate,
        endDate,
        getOneOlderCoverageForDef(def.definitionId, def.repositoryId),
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
  collectionName: string,
  project: string,
  repositoryIds: string[],
  startDate: Date,
  endDate: Date
) => {
  const testsForDefsForRepoIds = await RepositoryModel.aggregate<TestsForDef>([
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
        tests: { $push: '$$ROOT' },
      },
    },
    {
      $project: {
        _id: 0,
        id: 1,
        repositoryId: 1,
        tests: 1,
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

  const definitionTests = await Promise.all(
    testsForDefsForRepoIds.map(async def => {
      const tests = await makeContinuous(
        def.tests,
        startDate,
        endDate,
        getOneOlderTestRunForDef(def.definitionId, def.repositoryId),
        { hasTests: false }
      );

      const latestTest = tests ? [...tests.reverse()].find(t => t.hasTests) : null;

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
