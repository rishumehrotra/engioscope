import { head, last, range } from 'rambda';
import { z } from 'zod';
import { oneDayInMs, oneWeekInMs } from '../../shared/utils.js';
import { collectionAndProjectInputs, dateRangeInputs, inDateRange } from './helpers.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import type { BranchCoverage, CoverageByWeek } from './code-coverage.js';
// import {
//   getBranchCoverageForRepo,
//   getOldCoverageForDefinition,
// } from './code-coverage.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import {
  getCoveragesForRepo,
  getOneOldCoverageForBuildDefID,
  // getOneOldTestForBuildDefID,
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
};

export type BuildDefWithTests = BuildDef & Partial<TestsForDef>;

export type BuildDefWithTestsAndCoverage = BuildDef &
  Partial<TestsForDef> &
  Partial<BranchCoverage>;

const makeContinuous = async (
  tests: TestsForWeek[] | undefined,
  startDate: Date,
  endDate: Date,
  getOneOlderTestRun: () => Promise<TestsForWeek | null>
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
    .reduce<Promise<TestsForWeek[]>>(async (acc, weekIndex, index) => {
      const matchingTest = tests.find(t => t.weekIndex === weekIndex);

      if (matchingTest) return [...(await acc), matchingTest];

      if (index === 0) {
        const olderTest = await getOneOlderTestRun();

        if (!olderTest) {
          return [
            {
              weekIndex,
              totalTests: 0,
              passedTests: 0,
              startedDate: null,
              completedDate: null,
              hasTests: false,
            },
          ];
        }

        return [{ ...olderTest, weekIndex }];
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lastItem = last(await acc)!;
      return [...(await acc), { ...lastItem, weekIndex }];
    }, Promise.resolve([]))
    .then(list => list.slice(totalIntervals - Math.floor(totalDays / 7)));
};

const makeContinuousCoverage = async (
  coverage: CoverageByWeek[] | undefined,
  startDate: Date,
  endDate: Date,
  getOneOlderCoverageForDef: () => Promise<CoverageByWeek | null>
) => {
  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

  if (!coverage) {
    const olderCoverage = await getOneOlderCoverageForDef();
    if (!olderCoverage) return null;

    return range(0, totalIntervals).map(weekIndex => {
      return { ...olderCoverage, weekIndex };
    });
  }

  return range(0, totalIntervals)
    .reduce<Promise<CoverageByWeek[]>>(async (acc, weekIndex, index) => {
      const matchingCoverage = coverage.find(t => t.weekIndex === weekIndex);

      if (matchingCoverage) return [...(await acc), matchingCoverage];

      if (index === 0) {
        const olderCoverage = await getOneOlderCoverageForDef();

        if (!olderCoverage) {
          return [
            {
              weekIndex,
              buildId: 0,
              definitionId: 0,
              hasCoverage: false,
            },
          ];
        }
        return [{ ...olderCoverage, weekIndex }];
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lastItem = last(await acc)!;
      return [...(await acc), { ...lastItem, weekIndex }];
    }, Promise.resolve([]))
    .then(list => list.slice(totalIntervals - Math.floor(totalDays / 7)));
};

// const makeContinuousData = async (
//   data: TestsForWeek[] | CoverageByWeek[] | undefined,
//   startDate: Date,
//   endDate: Date,
//   getOneOlderData: () => Promise<TestsForWeek | CoverageByWeek | null>
// ) => {
//   const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
//   const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

//   if()

//   if (!data) {
//     const olderData = await getOneOlderData();
//     if (!olderData) return null;

//     return range(0, totalIntervals).map(weekIndex => {
//       return { ...olderData, weekIndex };
//     });
//   }

//   return range(0, totalIntervals)
//     .reduce<Promise<TestsForWeek[]>>(async (acc, weekIndex, index) => {
//       const matchingData = tests.find(t => t.weekIndex === weekIndex);

//       if (matchingData) return [...(await acc), matchingData];

//       if (index === 0) {
//         const olderData = await getOneOlderData();

//         if (!olderData) {
//           return [
//             {
//               weekIndex,
//               totalTests: 0,
//               passedTests: 0,
//               startedDate: null,
//               completedDate: null,
//               hasTests: false,
//             },
//           ];
//         }

//         return [{ ...olderData, weekIndex }];
//       }

//       // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//       const lastItem = last(await acc)!;
//       return [...(await acc), { ...lastItem, weekIndex }];
//     }, Promise.resolve([]))
//     .then(list => list.slice(totalIntervals - Math.floor(totalDays / 7)));
// };
export const getOldTestRunsForDefinition = async (
  collectionName: string,
  project: string,
  startDate: Date,
  repositoryId: string,
  definitionId: number
) => {
  const result = await RepositoryModel.aggregate<TestsForWeek>([
    {
      $match: {
        'collectionName': collectionName,
        'project.name': project,
        'id': repositoryId,
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
                  // Different from the original query
                  { $eq: ['$definition.id', definitionId] },
                  { $lt: ['$finishTime', new Date(startDate)] },
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
    {
      $group: {
        _id: {
          definitionId: '$build.definitionId',
          weekIndex: {
            $trunc: {
              $divide: [
                { $subtract: ['$build.finishTime', new Date(startDate)] },
                oneWeekInMs,
              ],
            },
          },
        },
        collectionName: { $first: '$collectionName' },
        project: { $first: '$project' },
        repositoryId: { $first: '$repositoryId' },
        repositoryName: { $first: '$repositoryName' },
        build: { $first: '$build' },
      },
    },
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
              release: { $exists: false },
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project.name', '$$project'] },
                  { $eq: ['$buildConfiguration.id', '$$buildId'] },
                ],
              },
            },
          },
          {
            $addFields: {
              passed: {
                $filter: {
                  input: '$runStatistics',
                  as: 'stats',
                  cond: { $eq: ['$$stats.outcome', 'Passed'] },
                },
              },
            },
          },
          {
            $addFields: {
              passedCount: { $sum: '$passed.count' },
            },
          },
        ],
        as: 'tests',
      },
    },
    {
      $project: {
        _id: 0,
        weekIndex: '$_id.weekIndex',
        hasTests: { $gt: [{ $size: '$tests' }, 0] },
        totalTests: { $sum: '$tests.totalTests' },
        startedDate: { $min: '$tests.startedDate' },
        completedDate: { $max: '$tests.completedDate' },
        passedTests: { $sum: '$tests.passedCount' },
      },
    },
    { $sort: { weekIndex: -1 } },
    {
      $match: {
        totalTests: { $gt: 0 },
      },
    },
    {
      $limit: 1,
    },
  ]);

  return head(result) || null;
};

export const getTestrunsForRepo = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  startDate: Date,
  endDate: Date
) => {
  const result = RepositoryModel.aggregate<TestsForDef>([
    {
      $match: {
        'collectionName': collectionName,
        'project.name': project,
        'id': repositoryId,
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
              finishTime: inDateRange(startDate, endDate),
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
    {
      $group: {
        _id: {
          definitionId: '$build.definitionId',
          weekIndex: {
            $trunc: {
              $divide: [
                { $subtract: ['$build.finishTime', new Date(startDate)] },
                oneWeekInMs,
              ],
            },
          },
        },
        collectionName: { $first: '$collectionName' },
        project: { $first: '$project' },
        repositoryId: { $first: '$repositoryId' },
        repositoryName: { $first: '$repositoryName' },
        build: { $first: '$build' },
      },
    },
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
              release: { $exists: false },
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project.name', '$$project'] },
                  { $eq: ['$buildConfiguration.id', '$$buildId'] },
                ],
              },
            },
          },
          {
            $addFields: {
              passed: {
                $filter: {
                  input: '$runStatistics',
                  as: 'stats',
                  cond: { $eq: ['$$stats.outcome', 'Passed'] },
                },
              },
            },
          },
          {
            $addFields: {
              passedCount: { $sum: '$passed.count' },
            },
          },
        ],
        as: 'tests',
      },
    },
    {
      $project: {
        _id: 0,
        definitionId: '$_id.definitionId',
        weekIndex: '$_id.weekIndex',
        totalTests: { $sum: '$tests.totalTests' },
        startedDate: { $min: '$tests.startedDate' },
        completedDate: { $max: '$tests.completedDate' },
        passedTests: { $sum: '$tests.passedCount' },
        hasTests: { $gt: [{ $size: '$tests' }, 0] },
      },
    },

    { $sort: { weekIndex: -1 } },
    {
      $group: {
        _id: '$definitionId',
        definitionId: { $first: '$definitionId' },
        tests: { $push: '$$ROOT' },
      },
    },
  ]);

  return result;
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
    // getTestrunsForRepo(collectionName, project, repositoryId, startDate, endDate),
    // getBranchCoverageForRepo(collectionName, project, repositoryId, startDate, endDate),
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
    return getOldTestRunsForDefinition(
      collectionName,
      project,
      startDate,
      repositoryId,
      defId
    );
    // return getOneOldTestForBuildDefID(
    //   collectionName,
    //   project,
    //   repositoryId,
    //   defId,
    //   startDate
    // );
  };

  const getOneOlderCoverageForDef = (defId: number) => () => {
    // return getOldCoverageForDefinition(
    //   collectionName,
    //   project,
    //   startDate,
    //   repositoryId,
    //   defId
    // );

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
        getOneOlderTestRunForDef(def.id)
      );

      const coverageData = await makeContinuousCoverage(
        def.coverageByWeek || undefined,
        startDate,
        endDate,
        getOneOlderCoverageForDef(def.id)
      );

      return {
        ...def,
        tests,
        coverageByWeek: coverageData,
        latestTest: tests ? last(tests) : null,
        latestCoverage: coverageData ? last(coverageData) : null,
      };
    })
  );
  return definitionTestsAndCoverage;
};
