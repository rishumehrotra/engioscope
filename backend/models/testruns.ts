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
  repositoryId: z.string().optional(),
  ...dateRangeInputs,
});

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
      weekIndex: number;
      // weekDate: string;
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
            // weekDate: {
            //   $dateToString: {
            //     format: '%Y-%m-%d',
            //     date: {
            //       $subtract: [
            //         '$build.finishTime',
            //         {
            //           $mod: [
            //             {
            //               $subtract: [
            //                 '$build.finishTime',
            //                 new Date('Thu, 01 Jan 1970 00:00:00 GMT'),
            //               ],
            //             },
            //             oneWeekInMs,
            //           ],
            //         },
            //       ],
            //     },
            //   },
            // },
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
          // weekDate: '$_id.weekDate',
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
      // { $sort: { weekDate: -1 } },
      { $sort: { weekIndex: -1 } },
      {
        $group: {
          _id: '$definitionId',
          tests: { $push: '$$ROOT' },
        },
      },
    ]),
  ]);

  type ResultType = DefType & Partial<DefTestType>;

  // Mapping the build definitions/pipelines with no testruns
  const result: ResultType[] = (definitionList as DefType[]).map(definition => {
    const tests = definitionTestRuns.find(def => def._id === definition.id);
    return { ...definition, ...tests } || definition;
  });

  // Adding the missing weekIndex data for the Build Definition Tests
  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));
  const intervals = range(0, totalIntervals);
  const definitionTests = result.map(def => {
    if (!def.tests) return def;

    const tests = intervals
      .map(weekIndex => {
        return (
          def.tests?.find(test => test.weekIndex === weekIndex) || {
            weekIndex,
            totalTests: 0,
            startedDate: null,
            completedDate: null,
            passedTests: 0,
            testId: [],
            definitionId: def._id,
          }
        );
      })
      .slice(totalIntervals - Math.floor(totalDays / 7));

    return {
      ...def,
      tests,
    };
  });
  return definitionTests;
};
