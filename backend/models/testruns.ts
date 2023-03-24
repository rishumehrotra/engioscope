import type { PipelineStage } from 'mongoose';
import { last, range } from 'rambda';
import { z } from 'zod';
import { oneDayInMs } from '../../shared/utils.js';
import { collectionAndProjectInputs, dateRangeInputs } from './helpers.js';
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
      totalTests: number;
      startedDate: Date;
      completedDate: Date;
      passedTests: number;
    }
);

export type TestsForDef = {
  definitionId: number;
  tests: TestsForWeek[];
  latest?: TestsForWeek;
  repositoryId: string;
};

export type BuildDefWithTests = BuildDef & Partial<TestsForDef>;

export type BuildDefWithTestsAndCoverage = BuildDef &
  Partial<TestsForDef> &
  Partial<BranchCoverage>;

export const makeContinuous = async <T extends { weekIndex: number }>(
  tests: T[] | undefined,
  startDate: Date,
  endDate: Date,
  getOneOlderTestRun: () => Promise<T | null>,
  emptyValue: Omit<T, 'weekIndex'>
) => {
  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

  if (!tests) {
    const olderTest = await getOneOlderTestRun();
    if (!olderTest) return null;

    return range(0, totalIntervals).map(weekIndex => {
      return { ...olderTest, weekIndex };
    });
  }

  return range(0, totalIntervals)
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
    .then(list => list.slice(totalIntervals - Math.floor(totalDays / 7)));
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

  const buildDefsWithTestsAndCoverage: BuildDefWithTestsAndCoverage[] = (
    buildDefsWithTests as BuildDefWithTests[]
  ).map(definition => {
    const coverage = branchCoverage.find(def => def.definitionId === definition.id);
    return coverage
      ? { ...definition, coverageByWeek: coverage.coverageByWeek }
      : definition;
  });
  return buildDefsWithTestsAndCoverage;
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

  const definitionTestsAndCoverage = Promise.all(
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

      return {
        ...def,
        url: `${def.url.split('_apis')[0]}_build/definition?definitionId=${def.id}`,
        tests,
        coverageByWeek: coverageData,
        latestTest: tests ? last(tests) : null,
        latestCoverage: coverageData ? last(coverageData) : null,
      };
    })
  );
  return definitionTestsAndCoverage;
};

export const getPipelinesRunningTests = async (
  collectionName: string,
  project: string,
  repoIds?: string[]
) => {
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
          collectionName: '$collectionName',
          project: '$project',
          repositoryId: '$repositoryId',
          defaultBranch: '$defaultBranch',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project', '$$project'] },
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
            },
          },
          { $sort: { finishTime: -1 } },
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

  const [defsWithTests, defsWithCoverage] = await Promise.all([
    RepositoryModel.aggregate<{ count: number }>([
      ...getMainBranchBuildIdsStage,
      {
        $lookup: {
          from: 'testruns',
          let: {
            collectionName: '$collectionName',
            project: '$project',
            buildId: '$build.buildId',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$collectionName', '$$collectionName'] },
                    { $eq: ['$project.name', '$$project'] },
                    { $eq: ['$buildConfiguration.id', '$$buildId'] },
                  ],
                },
                release: { $exists: false },
              },
            },
            { $project: { _id: 1 } },
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
      {
        $group: {
          _id: null,
          defsWithTests: {
            $addToSet: { $cond: [{ $eq: ['$hasTests', true] }, '$definitionId', null] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          count: { $size: '$defsWithTests' },
        },
      },
    ]),

    RepositoryModel.aggregate<{ count: number }>([
      ...getMainBranchBuildIdsStage,
      {
        $lookup: {
          from: 'codecoverages',
          let: {
            collectionName: '$collectionName',
            project: '$project',
            buildId: '$build.buildId',
          },
          pipeline: [
            {
              $match: {
                '$expr': {
                  $and: [
                    { $eq: ['$collectionName', '$$collectionName'] },
                    { $eq: ['$project', '$$project'] },
                    { $eq: ['$build.id', '$$buildId'] },
                  ],
                },
                'coverageData.coverageStats.label': {
                  $in: ['Branch', 'Branches'],
                },
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
      {
        $group: {
          _id: null,
          defsWithCoverage: {
            $addToSet: {
              $cond: [{ $eq: ['$hasCoverage', true] }, '$definitionId', null],
            },
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
    defsWithTests: defsWithTests[0]?.count || 0,
    defsWithCoverage: defsWithCoverage[0]?.count || 0,
  };
};

export const getWeeklyProjectCollectionTests2 = async (
  collectionName: string,
  project: string,
  repositoryIds: string[],
  startDate: Date,
  endDate: Date
) => {
  const testrunsForAllDefs = await RepositoryModel.aggregate<TestsForDef>([
    ...getMainBranchBuildIds(
      collectionName,
      project,
      repositoryIds,
      startDate,
      queryForFinishTimeInRange(startDate, endDate)
    ),
    ...getTestsForBuildIds,
    {
      $group: {
        _id: '$definitionId',
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

  const weeklyDefinitionTests = Promise.all(
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

  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

  const flatWeeklyDefinitionTests = (await weeklyDefinitionTests).flatMap(data => {
    if (!data.tests) return [];
    return data.tests.map(test => ({ ...test }));
  });

  const finalResult = range(0, totalIntervals).map(weekIndex => {
    const matchingTests = flatWeeklyDefinitionTests.filter(
      def => def.weekIndex === weekIndex
    );

    const totalTests = matchingTests.reduce((acc, curr) => {
      return curr.hasTests ? acc + curr.totalTests : acc + 0;
    }, 0);

    const passedTests = matchingTests.reduce((acc, curr) => {
      return curr.hasTests ? acc + curr.passedTests : acc + 0;
    }, 0);

    return {
      weekIndex,
      passedTests,
      totalTests,
    };
  });

  return finalResult.slice(totalIntervals - Math.floor(totalDays / 7));
};
export const getWeeklyProjectCollectionCoverage2 = async (
  collectionName: string,
  project: string,
  repositoryIds: string[],
  startDate: Date,
  endDate: Date
) => {
  const coverageForAllDefs = await RepositoryModel.aggregate<BranchCoverage>([
    ...getMainBranchBuildIds(
      collectionName,
      project,
      repositoryIds,
      startDate,
      queryForFinishTimeInRange(startDate, endDate)
    ),
    ...getCoverageForBuildIDs,
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

  const getOneOlderCoverageForDef = (defId: number, repositoryId: string) => () => {
    return getOneOldCoverageForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const weeklyDefinitionCoverage = Promise.all(
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

  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));
  const flatWeeklyDefinitionCoverage = (await weeklyDefinitionCoverage).flatMap(data => {
    if (!data.coverageByWeek) return [];
    return data.coverageByWeek.map(coverage => ({ ...coverage }));
  });

  const finalResult = range(0, totalIntervals).map(weekIndex => {
    const matchingCoverage = flatWeeklyDefinitionCoverage.filter(
      def => def.weekIndex === weekIndex
    );

    const coveredBranches = matchingCoverage.reduce((acc, curr) => {
      return curr.coverage ? acc + curr.coverage.coveredBranches : acc + 0;
    }, 0);

    const totalBranches = matchingCoverage.reduce((acc, curr) => {
      return curr.coverage ? acc + curr.coverage.totalBranches : acc + 0;
    }, 0);

    return {
      weekIndex,
      coveredBranches,
      totalBranches,
    };
  });

  return finalResult.slice(totalIntervals - Math.floor(totalDays / 7));
};
