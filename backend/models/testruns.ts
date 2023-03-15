import { head, last, range } from 'rambda';
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

type BuildDef = { id: number; name: string; url: string };

type TestsForWeek = {
  weekIndex: number;
  totalTests: number;
  startedDate: Date | null;
  completedDate: Date | null;
  passedTests: number;
  hasTests: boolean;
};
type TestsForDef = {
  definitionId: number;
  tests: TestsForWeek[];
  latest?: TestsForWeek;
};
type BuildDefWithTests = BuildDef & Partial<TestsForDef>;

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
    {
      $addFields: {
        hasTests: { $gt: [{ $size: '$testIds' }, 0] },
        foundTests: {
          $and: [{ $gt: [{ $size: '$testIds' }, 0] }, { $ne: ['$completedDate', null] }],
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
    {
      $project: {
        definitionId: 0,
        testIds: 0,
        buildId: 0,
      },
    },
  ]);

  return head(result) || null;
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
    RepositoryModel.aggregate<TestsForDef>([
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
      {
        $addFields: {
          hasTests: { $gt: [{ $size: '$testIds' }, 0] },
          foundTests: {
            $and: [
              { $gt: [{ $size: '$testIds' }, 0] },
              { $ne: ['$completedDate', null] },
            ],
          },
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
      {
        $project: {
          '_id': 0,
          'tests.definitionId': 0,
          'tests.testIds': 0,
          'tests.buildId': 0,
        },
      },
    ]),
  ]);

  // Mapping the build definitions/pipelines with no testruns
  const buildDefsWithTests: BuildDefWithTests[] = (definitionList as BuildDef[]).map(
    definition => {
      const tests = definitionTestRuns.find(def => def.definitionId === definition.id);
      return { ...definition, ...tests } || definition;
    }
  );
  return buildDefsWithTests;
};

export const getTestRunsForRepository = async ({
  collectionName,
  project,
  repositoryId,
  startDate,
  endDate,
}: z.infer<typeof TestRunsForRepositoryInputParser>) => {
  const testRunsForRepo = await getTestRunsForRepo(
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
  };

  const definitionTests = Promise.all(
    testRunsForRepo.map(async def => {
      const tests = await makeContinuous(
        def.tests,
        startDate,
        endDate,
        getOneOlderTestRunForDef(def.id)
      );

      return {
        ...def,
        tests,
        latest: tests ? last(tests) : null,
      };
    })
  );
  return definitionTests;
};
