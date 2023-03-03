import { z } from 'zod';
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
  repositoryId: z.string().optional(),
  ...dateRangeInputs,
});
export const getTestRunsStatsFor =
  (testsFor: 'repository' | 'collection_and_project') =>
  async ({
    collectionName,
    project,
    repositoryId,
  }: z.infer<typeof TestRunsForRepositoryInputParser>) => {
    const result = await RepositoryModel.aggregate<BuildPipelineTests>([
      {
        $match: {
          collectionName,
          'project.name': project,
          // 'id': repositoryId,
          ...(testsFor === 'repository' && repositoryId ? { id: repositoryId } : {}),
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
      {
        $unwind: {
          path: '$build',
        },
      },
      {
        $group: {
          _id: '$build.definitionId',
          collectionName: { $first: '$collectionName' },
          project: { $first: '$project' },
          repositoryId: { $first: '$repositoryId' },
          repositoryName: { $first: '$repositoryName' },
          defaultBranch: { $first: '$defaultBranch' },
          buildId: { $first: '$build.buildId' },
          sourceBranch: { $first: '$build.sourceBranch' },
          definitionId: { $first: '$build.definitionId' },
          definitionName: { $first: '$build.definitionName' },
          finishTime: { $first: '$build.finishTime' },
        },
      },
      {
        $lookup: {
          from: 'testruns',
          let: {
            collectionName: '$collectionName',
            project: '$project',
            buildId: '$buildId',
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
            { $limit: 1 },
            {
              $addFields: {
                testDuration: {
                  $dateDiff: {
                    startDate: '$startedDate',
                    endDate: '$completedDate',
                    unit: 'millisecond',
                  },
                },
              },
            },
          ],
          as: 'tests',
        },
      },
      {
        $match: {
          'tests.id': { $exists: true },
        },
      },
      { $unwind: { path: '$tests' } },
      {
        $project: {
          collectionName: 1,
          project: 1,
          repositoryId: 1,
          repositoryName: 1,
          defaultBranch: 1,
          buildId: 1,
          sourceBranch: 1,
          definitionId: 1,
          definitionName: 1,
          testId: '$test.id',
          testDuration: '$tests.testDuration',
          totalTests: '$tests.totalTests',
          testStats: '$tests.runStatistics',
          testsName: '$tests.name',
        },
      },
    ]);

    return result;
  };

export const getTestRunsOverview = getTestRunsStatsFor('collection_and_project');

export const getTestRunsForRepository = async ({
  collectionName,
  project,
  repositoryId,
  startDate,
  endDate,
}: z.infer<typeof TestRunsForRepositoryInputParser>) => {
  type DefType = { id: number; name: string; url: string };

  type DefTestType = {
    _id: number;
    tests: {
      definitionId: number;
      weekDate: string;
      totalTests: number;
      startedDate: Date;
      completedDate: Date;
      passedTests: number;
      testId: string;
    }[];
  };

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
            weekDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $subtract: [
                    // startDate,
                    '$build.finishTime',
                    {
                      $mod: [
                        {
                          $subtract: [
                            // startDate,
                            '$build.finishTime',
                            new Date('Thu, 01 Jan 1970 00:00:00 GMT'),
                          ],
                        },
                        604_800_000,
                      ],
                    },
                  ],
                },
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
          weekDate: '$_id.weekDate',
          totalTests: { $sum: '$tests.totalTests' },
          startedDate: { $min: '$tests.startedDate' },
          completedDate: { $max: '$tests.completedDate' },
          passedTests: { $sum: '$tests.passedCount' },
          testId: { $sum: '$tests.id' },
        },
      },
      { $sort: { weekDate: -1 } },
      {
        $group: {
          _id: '$definitionId',
          tests: { $push: '$$ROOT' },
        },
      },
    ]),
  ]);

  type ResultType = DefType & Partial<DefTestType>;

  const result: ResultType[] = (definitionList as DefType[]).map(definition => {
    const tests = definitionTestRuns.find(def => def._id === definition.id);
    return { ...definition, ...tests } || definition;
  });
  return result;
};
