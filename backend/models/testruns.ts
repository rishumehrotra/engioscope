import { TestRunModel } from './mongoose-models/TestRunModel.js';

export const getTestRunsStatsFor =
  (testsFor: 'repository' | 'collection_and_project') =>
  async (collectionName: string, project: string, repositoryId: string | undefined) => {
    const result = await TestRunModel.aggregate([
      {
        $match: {
          collectionName,
          'project.name': project,
          ...(testsFor === 'repository' ? { id: repositoryId } : {}),
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
                    {
                      $eq: ['$collectionName', '$$collectionName'],
                    },
                    {
                      $eq: ['$project', '$$project'],
                    },
                    {
                      $eq: ['$repository.id', '$$repositoryId'],
                    },
                    {
                      $eq: ['$sourceBranch', '$$defaultBranch'],
                    },
                  ],
                },
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
      {
        $unwind: {
          path: '$build',
        },
      },
      {
        $group: {
          _id: '$build.definitionId',
          collectionName: {
            $first: '$collectionName',
          },
          project: {
            $first: '$project',
          },
          repositoryId: {
            $first: '$repositoryId',
          },
          repositoryName: {
            $first: '$repositoryName',
          },
          defaultBranch: {
            $first: '$defaultBranch',
          },
          buildId: {
            $first: '$build.buildId',
          },
          sourceBranch: {
            $first: '$build.sourceBranch',
          },
          definitionId: {
            $first: '$build.definitionId',
          },
          definitionName: {
            $first: '$build.definitionName',
          },
          finishTime: {
            $first: '$build.finishTime',
          },
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
                release: {
                  $exists: false,
                },
                $expr: {
                  $and: [
                    {
                      $eq: ['$collectionName', '$$collectionName'],
                    },
                    {
                      $eq: ['$project.name', '$$project'],
                    },
                    {
                      $eq: ['$buildConfiguration.id', '$$buildId'],
                    },
                  ],
                },
              },
            },
            {
              $limit: 1,
            },
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
    ]);

    return result;
  };

export const getTestRunsForRepository = getTestRunsStatsFor('repository');
export const getTestRunsOverview = getTestRunsStatsFor('collection_and_project');
