import { range } from 'rambda';
import { z } from 'zod';
import { oneDayInMs, oneWeekInMs } from '../../shared/utils.js';
import { collectionAndProjectInputs, dateRangeInputs, inDateRange } from './helpers.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';

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

type DefType = { id: number; name: string; url: string };

type DefTestType = {
  _id: number;
  tests: {
    definitionId: number;
    weekIndex: number;
    totalTests: number;
    startedDate: Date;
    completedDate: Date;
    passedTests: number;
    testId: string[];
  }[];
};

type TestType = {
  definitionId: number;
  weekIndex: number;
  totalTests: number;
  startedDate: Date | null;
  completedDate: Date | null;
  passedTests: number;
  testId: string[];
};

type ResultType = DefType & Partial<DefTestType>;

const fillMissingValues = (
  definitionId: number,
  intervals: number[],
  tests: TestType[]
) => {
  let prev: Partial<TestType> = {};
  let prevTotalTests = 0;
  let prevPassedTests = 0;
  return intervals.map(interval => {
    const item = tests.find(t => t.weekIndex === interval);
    prev = item ?? prev;
    prevTotalTests = !item || item.totalTests === 0 ? prevTotalTests : item.totalTests;
    prevPassedTests = !item || item.totalTests === 0 ? prevPassedTests : item.passedTests;

    return {
      weekIndex: interval,
      definitionId: prev.definitionId || definitionId,
      passedTests: prevPassedTests,
      totalTests: prevTotalTests,
      testId: prev.testId || [],
      completedDate: prev.completedDate || null,
      startedDate: prev.startedDate || null,
    };
  });
};

export const sortAndSliceTests = (
  tests: TestType[],
  totalIntervals: number,
  totalDays: number,
  intervalDays: number
) => {
  return tests
    .sort((a, b) => {
      if (a.weekIndex && b.weekIndex && a.weekIndex - b.weekIndex) {
        return a.weekIndex - b.weekIndex;
      }
      return 0;
    })
    .slice(totalIntervals - Math.floor(totalDays / intervalDays));
};

export const getOldTestRunsForDefinition = async (
  collectionName: string,
  project: string,
  startDate: Date,
  repositoryId: string,
  definitionId: number
) => {
  const result = await RepositoryModel.aggregate<TestType>([
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
        definitionId: '$_id.definitionId',
        weekIndex: '$_id.weekIndex',
        totalTests: { $sum: '$tests.totalTests' },
        startedDate: { $min: '$tests.startedDate' },
        completedDate: { $max: '$tests.completedDate' },
        passedTests: { $sum: '$tests.passedCount' },
        buildId: '$build.buildId',
        testIds: {
          $reduce: {
            input: '$tests.id',
            initialValue: [],
            in: { $setUnion: ['$$value', ['$$this']] },
          },
        },
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

  return result[0] || null;
};

export const getTestRunsForRepo = async (
  collectionName: string,
  project: string,
  startDate: Date,
  endDate: Date,
  repositoryId: string
) => {
  const [definitionList, definitionTestRuns] = await Promise.all([
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
    RepositoryModel.aggregate<DefTestType>([
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
          buildId: '$build.buildId',
          testIds: {
            $reduce: {
              input: '$tests.id',
              initialValue: [],
              in: { $setUnion: ['$$value', ['$$this']] },
            },
          },
        },
      },

      { $sort: { weekIndex: -1 } },
      {
        $group: {
          _id: '$definitionId',
          tests: { $push: '$$ROOT' },
        },
      },
    ]),
  ]);

  // Mapping the build definitions/pipelines with no testruns
  const result: ResultType[] = (definitionList as DefType[]).map(definition => {
    const tests = definitionTestRuns.find(def => def._id === definition.id);
    return { ...definition, ...tests } || definition;
  });
  return result;
};

export const getTestRunsForRepository = async ({
  collectionName,
  project,
  repositoryId,
  startDate,
  endDate,
}: z.infer<typeof TestRunsForRepositoryInputParser>) => {
  const result = await getTestRunsForRepo(
    collectionName,
    project,
    startDate,
    endDate,
    repositoryId
  );

  // Adding the missing weekIndex data for the Build Definition Tests
  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));
  const intervals = range(0, totalIntervals);
  const definitionTests = Promise.all(
    result.map(async def => {
      if (!def.tests) {
        // console.log('Triggered No Tests');
        const oldTestsForDef = await getOldTestRunsForDefinition(
          collectionName,
          project,
          startDate,
          repositoryId,
          def.id
        );

        // console.log(
        //   oldTestsForDef
        //     ? `--===| Old Tests for ${def.name} : ${def.id} |===--`
        //     : `No Old Tests for ${def.name} : ${def.id}}`
        // );

        if (oldTestsForDef) {
          const tests = fillMissingValues(def.id, intervals, [oldTestsForDef]);

          return {
            ...def,
            tests: sortAndSliceTests(tests, totalIntervals, totalDays, 7),
          };
        }
        return def;
      }

      // Check if first weekIndex data is missing
      if (def.tests[0].weekIndex !== 0) {
        // console.log('Triggered Non Zero');
        const oldTestsForDef = await getOldTestRunsForDefinition(
          collectionName,
          project,
          startDate,
          repositoryId,
          def.id
        );

        // console.log(
        //   oldTestsForDef
        //     ? `--===| Old Tests for ${def.name} : ${def.id} |===--`
        //     : `No Old Tests for ${def.name} : ${def.id}}`
        // );

        if (oldTestsForDef) {
          const tests = fillMissingValues(def.id, intervals, [
            oldTestsForDef,
            ...def.tests,
          ]);

          return {
            ...def,
            tests: sortAndSliceTests(tests, totalIntervals, totalDays, 7),
          };
        }

        const tests = fillMissingValues(def.id, intervals, def.tests);
        return {
          ...def,
          tests: sortAndSliceTests(tests, totalIntervals, totalDays, 7),
        };
      }
      // console.log('Triggered Normal');
      const tests = fillMissingValues(def.id, intervals, def.tests);
      // console.log(`--===| Tests for ${def.name} : ${def.id} |===--`, tests);

      return {
        ...def,
        tests: tests
          .sort((a, b) => {
            if (a.weekIndex && b.weekIndex && a.weekIndex - b.weekIndex) {
              return a.weekIndex - b.weekIndex;
            }
            return 0;
          })
          .slice(totalIntervals - Math.floor(totalDays / 7)),
      };
    })
  );
  return definitionTests;
};
