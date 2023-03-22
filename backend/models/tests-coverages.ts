import type { FilterQuery, PipelineStage } from 'mongoose';
import { head } from 'rambda';
import { oneWeekInMs } from '../../shared/utils.js';

import { inDateRange } from './helpers.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import type { TestsForDef, TestsForWeek } from './testruns.js';

export type CoverageByWeek = {
  weekIndex: number;
  hasCoverage: boolean;
  definitionId: number;
  buildId: number;
  coverage?: {
    totalBranches: number;
    coveredBranches: number;
  };
};
export type BranchCoverage = {
  definitionId: number;
  coverageByWeek: CoverageByWeek[];
};

export const queryOlderForDefinitionId = (definitionId: number, startDate: Date) => ({
  'definition.id': definitionId,
  'finishTime': { $lt: new Date(startDate) },
});

export const queryForFinishTimeInRange = (startDate: Date, endDate: Date) => ({
  finishTime: inDateRange(startDate, endDate),
});

export const getMainBranchBuildIds = (
  collectionName: string,
  project: string,
  repositoryId: string,
  startDate: Date,
  additionalQuery: FilterQuery<unknown>
): PipelineStage[] => {
  // Assume we're querying the repository collection
  return [
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
                  {
                    $or: [
                      { $eq: ['$result', 'failed'] },
                      { $eq: ['$result', 'succeeded'] },
                    ],
                  },
                ],
              },
              ...additionalQuery,
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
  ];
};

const getTestsForBuildIds: PipelineStage[] = [
  // Assume we're dealing with the data from getMainBranchBuildIds
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
      hasTests: { $gt: [{ $size: '$tests' }, 0] },
      totalTests: { $sum: '$tests.totalTests' },
      startedDate: { $min: '$tests.startedDate' },
      completedDate: { $max: '$tests.completedDate' },
      passedTests: { $sum: '$tests.passedCount' },
    },
  },
  { $sort: { weekIndex: -1 } },
];

export const getTestsForRepo = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  startDate: Date,
  endDate: Date
) => {
  const result = await RepositoryModel.aggregate<TestsForDef>([
    ...getMainBranchBuildIds(
      collectionName,
      project,
      repositoryId,
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

  return result;
};

export const getOneOldTestForBuildDefID = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  definitionId: number,
  startDate: Date
) => {
  const result = await RepositoryModel.aggregate<TestsForWeek>([
    ...getMainBranchBuildIds(
      collectionName,
      project,
      repositoryId,
      startDate,
      queryOlderForDefinitionId(definitionId, startDate)
    ),
    ...getTestsForBuildIds,
    {
      $match: {
        totalTests: { $gt: 0 },
      },
    },
    { $limit: 1 },
  ]);
  return head(result) || null;
};

export const getCoverageForBuildIDs: PipelineStage[] = [
  // Assume we're dealing with the data from getMainBranchBuildIds
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
        { $unwind: { path: '$coverageData' } },
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
        { $project: { _id: 0 } },
      ],
      as: 'coverage',
    },
  },
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
  { $sort: { weekIndex: -1 } },
];

export const getCoveragesForRepo = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  startDate: Date,
  endDate: Date
) => {
  const result = await RepositoryModel.aggregate<BranchCoverage>([
    ...getMainBranchBuildIds(
      collectionName,
      project,
      repositoryId,
      startDate,
      queryForFinishTimeInRange(startDate, endDate)
    ),
    ...getCoverageForBuildIDs,
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
      },
    },
  ]);
  return result;
};

export const getOneOldCoverageForBuildDefID = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  definitionId: number,
  startDate: Date
) => {
  const result = await RepositoryModel.aggregate<CoverageByWeek>([
    ...getMainBranchBuildIds(
      collectionName,
      project,
      repositoryId,
      startDate,
      queryOlderForDefinitionId(definitionId, startDate)
    ),
    ...getCoverageForBuildIDs,
    { $match: { hasCoverage: true } },
    { $limit: 1 },
  ]);
  return head(result) || null;
};
