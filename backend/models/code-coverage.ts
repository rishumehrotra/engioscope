import { oneWeekInMs } from '../../shared/utils.js';
import { inDateRange } from './helpers.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';

export type BranchCoverage = {
  definitionId: number;
  coverageStats: {
    total: number;
    covered: number;
  };
  coverageByWeek: {
    weekIndex: number;
    hasCoverage: boolean;
    definitionId: number;
    buildId: number;
    coverage?: {
      totalBranches: number;
      coveredBranches: number;
    };
  }[];
};

export const getBranchCoverageForRepo = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  startDate: Date,
  endDate: Date
) => {
  const result = await RepositoryModel.aggregate<BranchCoverage>([
    {
      $match: {
        collectionName,
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
        from: 'codecoverages',
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
                  { $eq: ['$project', '$$project'] },
                  { $eq: ['$build.id', '$$buildId'] },
                ],
              },
            },
          },
          {
            $unwind: {
              path: '$coverageData',
            },
          },
          {
            $addFields: {
              branchCoverage: {
                $filter: {
                  input: '$coverageData.coverageStats',
                  as: 'stat',
                  cond: {
                    $or: [
                      { $eq: ['$$stat.label', 'Branch'] },
                      { $eq: ['$$stat.label', 'Branches'] },
                    ],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              totalBranches: { $sum: '$branchCoverage.total' },
              coveredBranches: { $sum: '$branchCoverage.covered' },
            },
          },
          {
            $group: {
              _id: '$build.id',
              totalBranches: { $sum: '$totalBranches' },
              coveredBranches: { $sum: '$coveredBranches' },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ],
        as: 'coverage',
      },
    },
    // {
    //   $addFields: {
    //     hasCoverage: { $gt: [{ $size: '$coverage' }, 0] },
    //     weekIndex: '$_id.weekIndex',
    //     definitionId: '$_id.definitionId',
    //   },
    // },
    {
      $project: {
        hasCoverage: { $gt: [{ $size: '$coverage' }, 0] },
        weekIndex: '$_id.weekIndex',
        definitionId: '$_id.definitionId',
        buildId: '$build.buildId',
        coverage: '$coverage',
        _id: 0,
      },
    },
    {
      $unwind: {
        path: '$coverage',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { weekIndex: -1 },
    },
    {
      $group: {
        _id: '$definitionId',
        definitionId: { $first: '$definitionId' },
        coverage: { $push: '$$ROOT' },
      },
    },
    {
      $project: {
        _id: 0,
        definitionId: 1,
        coverageByWeek: '$coverage',
        coverageStats: {
          total: { $sum: '$coverage.coverage.totalBranches' },
          covered: { $sum: '$coverage.coverage.coveredBranches' },
        },
      },
    },
  ]);

  return result;
};
