import { range } from 'rambda';
import { oneWeekInMs } from '../../shared/utils.js';
import { inDateRange } from './helpers.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import type { BuildDef } from './testruns.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';
import { createIntervals } from '../utils.js';

export const getBuildDefinitionsForProject = (collectionName: string, project: string) =>
  BuildDefinitionModel.find({ collectionName, project }).lean();

export const getBuildDefinitionsForRepo = (options: {
  collectionName: string;
  project: string;
  repositoryId: string;
}) => {
  return BuildDefinitionModel.find(options).lean();
};

export const getBuildPipelineCount = (collectionName: string, project: string) =>
  BuildDefinitionModel.count({ collectionName, project }).count().exec();

export const getPipelineIds =
  (type: 'active' | 'nonActive') => (queryContext: QueryContext, repoIds: string[]) => {
    const { collectionName, project, startDate, endDate } = fromContext(queryContext);
    return BuildDefinitionModel.find({
      collectionName,
      project,
      repositoryId: { $in: repoIds },
      ...(type === 'active'
        ? { 'latestBuild.finishTime': inDateRange(startDate, endDate) }
        : { 'latestBuild.finishTime': { $lt: startDate } }),
    })
      .distinct('id')
      .lean()
      .exec() as Promise<number[]>;
  };

export const getActivePipelineIds = getPipelineIds('active');
export const getNonActivePipelineIds = getPipelineIds('nonActive');

export const getDefinitionListWithRepoInfo = (
  collectionName: string,
  project: string,
  repoIds: string[]
) => {
  return RepositoryModel.aggregate<BuildDef>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: repoIds },
      },
    },
    {
      $lookup: {
        from: 'builddefinitions',
        let: {
          collectionName: '$collectionName',
          project: '$project.name',
          repositoryId: '$id',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$repositoryId', '$$repositoryId'] },
            },
          },
        ],
        as: 'pipeline',
      },
    },
    {
      $unwind: {
        path: '$pipeline',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        id: '$pipeline.id',
        name: '$pipeline.name',
        url: '$pipeline.url',
        repositoryName: '$name',
        repositoryId: '$id',
        repositoryUrl: '$url',
      },
    },
  ]).exec();
};

export const getPreStartDatePipelinesWithTests = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate } = fromContext(queryContext);

  const preStartDatePipelinesWithTests = await RepositoryModel.aggregate<{
    defsWithTests: number[];
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: repoIds },
        'defaultBranch': {
          $exists: true,
        },
      },
    },
    {
      $project: {
        _id: 0,
        collectionName: '$collectionName',
        project: '$project.name',
        repositoryId: '$id',
        repositoryName: '$name',
        repositoryUrl: '$url',
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
                  {
                    $eq: ['$repository.id', '$$repositoryId'],
                  },
                  {
                    $eq: ['$sourceBranch', '$$defaultBranch'],
                  },
                  {
                    $or: [
                      {
                        $eq: ['$result', 'failed'],
                      },
                      {
                        $eq: ['$result', 'succeeded'],
                      },
                    ],
                  },
                ],
              },
              finishTime: {
                $lt: startDate,
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
              '$expr': {
                $eq: ['$buildConfiguration.id', '$$buildId'],
              },
              'release': {
                $exists: false,
              },
            },
          },
          {
            $addFields: {
              passed: {
                $filter: {
                  input: '$runStatistics',
                  as: 'stats',
                  cond: {
                    $eq: ['$$stats.outcome', 'Passed'],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              passedCount: {
                $sum: '$passed.count',
              },
            },
          },
        ],
        as: 'tests',
      },
    },
    {
      $project: {
        _id: 0,
        definitionId: '$build.definitionId',
        repositoryId: '$repositoryId',
        repositoryName: '$repositoryName',
        repositoryUrl: '$repositoryUrl',
        hasTests: {
          $gt: [
            {
              $size: '$tests',
            },
            0,
          ],
        },
        totalTests: {
          $sum: '$tests.totalTests',
        },
        startedDate: {
          $min: '$tests.startedDate',
        },
        completedDate: {
          $max: '$tests.completedDate',
        },
        passedTests: {
          $sum: '$tests.passedCount',
        },
        buildId: '$build.buildId',
      },
    },
    {
      $match: {
        hasTests: true,
      },
    },
    {
      $group: {
        _id: null,
        defsWithTests: {
          $addToSet: {
            $cond: {
              if: {
                $eq: ['$hasTests', true],
              },
              then: '$definitionId',
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        defsWithTests: {
          $filter: {
            input: '$defsWithTests',
            as: 'id',
            cond: {
              $ne: ['$$id', null],
            },
          },
        },
      },
    },
  ]);

  return (
    preStartDatePipelinesWithTests[0] || {
      defsWithTests: [],
    }
  );
};

export const getQueryPeriodPipelinesWithTests = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return RepositoryModel.aggregate<{
    weekIndex: number;
    defsWithTests: number[];
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: repoIds },
        'defaultBranch': {
          $exists: true,
        },
      },
    },
    {
      $project: {
        _id: 0,
        collectionName: '$collectionName',
        project: '$project.name',
        repositoryId: '$id',
        repositoryName: '$name',
        repositoryUrl: '$url',
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
                  {
                    $eq: ['$repository.id', '$$repositoryId'],
                  },
                  {
                    $eq: ['$sourceBranch', '$$defaultBranch'],
                  },
                  {
                    $or: [
                      {
                        $eq: ['$result', 'failed'],
                      },
                      {
                        $eq: ['$result', 'succeeded'],
                      },
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
                {
                  $subtract: ['$build.finishTime', startDate],
                },
                oneWeekInMs,
              ],
            },
          },
        },
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
        repositoryUrl: {
          $first: '$repositoryUrl',
        },
        build: {
          $first: '$build',
        },
      },
    },
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
              '$expr': {
                $eq: ['$buildConfiguration.id', '$$buildId'],
              },
              'release': {
                $exists: false,
              },
            },
          },
          {
            $addFields: {
              passed: {
                $filter: {
                  input: '$runStatistics',
                  as: 'stats',
                  cond: {
                    $eq: ['$$stats.outcome', 'Passed'],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              passedCount: {
                $sum: '$passed.count',
              },
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
        repositoryId: '$repositoryId',
        repositoryName: '$repositoryName',
        repositoryUrl: '$repositoryUrl',
        hasTests: {
          $gt: [
            {
              $size: '$tests',
            },
            0,
          ],
        },
        totalTests: {
          $sum: '$tests.totalTests',
        },
        startedDate: {
          $min: '$tests.startedDate',
        },
        completedDate: {
          $max: '$tests.completedDate',
        },
        passedTests: {
          $sum: '$tests.passedCount',
        },
        buildId: '$build.buildId',
      },
    },
    {
      $sort: {
        weekIndex: -1,
      },
    },
    {
      $group: {
        _id: '$weekIndex',
        defsWithTests: {
          $addToSet: {
            $cond: {
              if: {
                $eq: ['$hasTests', true],
              },
              then: '$definitionId',
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        weekIndex: '$_id',
        defsWithTests: {
          $filter: {
            input: '$defsWithTests',
            as: 'id',
            cond: {
              $ne: ['$$id', null],
            },
          },
        },
      },
    },
  ]);
};

export const getWeeklyPipelinesWithTestsCount = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { startDate, endDate } = fromContext(queryContext);

  const [preStartDatePipelinesWithTests, queryPeriodPipelinesWithTests] =
    await Promise.all([
      getPreStartDatePipelinesWithTests(queryContext, repoIds),
      getQueryPeriodPipelinesWithTests(queryContext, repoIds),
    ]);

  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);

  const missingDaysPipelinesCount = range(0, numberOfIntervals).map(weekIndex => {
    return (
      queryPeriodPipelinesWithTests.find(day => day.weekIndex === weekIndex) || {
        weekIndex,
        defsWithTests: [],
      }
    );
  });
  const defsWithTestsSet = new Set(preStartDatePipelinesWithTests.defsWithTests || []);

  return missingDaysPipelinesCount
    .map(day => {
      day.defsWithTests.forEach(id => {
        defsWithTestsSet.add(id);
      });

      return {
        weekIndex: day.weekIndex,
        defsWithTests: defsWithTestsSet.size,
      };
    })
    .slice(numberOfIntervals - Math.floor(numberOfDays / 7));
};

export const getPreStartDatePipelinesWithCoverage = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate } = fromContext(queryContext);

  const preStartDatePipelinesWithCoverage = await RepositoryModel.aggregate<{
    defsWithCoverage: number[];
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: repoIds },
        'defaultBranch': {
          $exists: true,
        },
      },
    },
    {
      $project: {
        _id: 0,
        collectionName: '$collectionName',
        project: '$project.name',
        repositoryId: '$id',
        repositoryName: '$name',
        repositoryUrl: '$url',
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
                  {
                    $eq: ['$repository.id', '$$repositoryId'],
                  },
                  {
                    $eq: ['$sourceBranch', '$$defaultBranch'],
                  },
                  {
                    $or: [
                      {
                        $eq: ['$result', 'failed'],
                      },
                      {
                        $eq: ['$result', 'succeeded'],
                      },
                    ],
                  },
                ],
              },
              finishTime: {
                $lt: startDate,
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
              $expr: {
                $eq: ['$build.id', '$$buildId'],
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
                      {
                        $eq: ['$$stat.label', 'Branch'],
                      },
                      {
                        $eq: ['$$stat.label', 'Branches'],
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              totalBranches: {
                $sum: '$branchCoverage.total',
              },
              coveredBranches: {
                $sum: '$branchCoverage.covered',
              },
            },
          },
          {
            $group: {
              _id: '$build.id',
              totalBranches: {
                $sum: '$totalBranches',
              },
              coveredBranches: {
                $sum: '$coveredBranches',
              },
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
    {
      $project: {
        hasCoverage: {
          $gt: [
            {
              $size: '$coverage',
            },
            0,
          ],
        },
        repositoryId: '$repositoryId',
        repositoryName: '$repositoryName',
        weekIndex: '$_id.weekIndex',
        definitionId: '$build.definitionId',
        buildId: '$build.buildId',
        coverage: '$coverage',
        _id: 0,
      },
    },
    {
      $match: {
        hasCoverage: true,
      },
    },
    {
      $group: {
        _id: null,
        defsWithCoverage: {
          $addToSet: {
            $cond: {
              if: {
                $eq: ['$hasCoverage', true],
              },
              then: '$definitionId',
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        defsWithTests: {
          $filter: {
            input: '$defsWithCoverage',
            as: 'id',
            cond: {
              $ne: ['$$id', null],
            },
          },
        },
      },
    },
  ]);

  return (
    preStartDatePipelinesWithCoverage[0] || {
      defsWithCoverage: [],
    }
  );
};

export const getQueryPeriodPipelinesWithCoverage = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return RepositoryModel.aggregate<{
    weekIndex: number;
    defsWithCoverage: number[];
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'id': { $in: repoIds },
        'defaultBranch': {
          $exists: true,
        },
      },
    },
    {
      $project: {
        _id: 0,
        collectionName: '$collectionName',
        project: '$project.name',
        repositoryId: '$id',
        repositoryName: '$name',
        repositoryUrl: '$url',
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
                  {
                    $eq: ['$repository.id', '$$repositoryId'],
                  },
                  {
                    $eq: ['$sourceBranch', '$$defaultBranch'],
                  },
                  {
                    $or: [
                      {
                        $eq: ['$result', 'failed'],
                      },
                      {
                        $eq: ['$result', 'succeeded'],
                      },
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
                {
                  $subtract: ['$build.finishTime', startDate],
                },
                oneWeekInMs,
              ],
            },
          },
        },
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
        repositoryUrl: {
          $first: '$repositoryUrl',
        },
        build: {
          $first: '$build',
        },
      },
    },
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
              $expr: {
                $eq: ['$build.id', '$$buildId'],
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
                      {
                        $eq: ['$$stat.label', 'Branch'],
                      },
                      {
                        $eq: ['$$stat.label', 'Branches'],
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              totalBranches: {
                $sum: '$branchCoverage.total',
              },
              coveredBranches: {
                $sum: '$branchCoverage.covered',
              },
            },
          },
          {
            $group: {
              _id: '$build.id',
              totalBranches: {
                $sum: '$totalBranches',
              },
              coveredBranches: {
                $sum: '$coveredBranches',
              },
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
    {
      $project: {
        hasCoverage: {
          $gt: [
            {
              $size: '$coverage',
            },
            0,
          ],
        },
        repositoryId: '$repositoryId',
        repositoryName: '$repositoryName',
        weekIndex: '$_id.weekIndex',
        definitionId: '$_id.definitionId',
        buildId: '$build.buildId',
        coverage: '$coverage',
        _id: 0,
      },
    },
    {
      $match: {
        hasCoverage: true,
      },
    },
    {
      $sort: {
        weekIndex: -1,
      },
    },
    {
      $group: {
        _id: '$weekIndex',
        defsWithCoverage: {
          $addToSet: {
            $cond: {
              if: {
                $eq: ['$hasCoverage', true],
              },
              then: '$definitionId',
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        weekIndex: '$_id',
        defsWithCoverage: {
          $filter: {
            input: '$defsWithCoverage',
            as: 'id',
            cond: {
              $ne: ['$$id', null],
            },
          },
        },
      },
    },
  ]);
};

export const getWeeklyPipelinesWithCoverageCount = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { startDate, endDate } = fromContext(queryContext);

  const [preStartDatePipelinesWithCoverage, queryPeriodPipelinesWithCoverage] =
    await Promise.all([
      getPreStartDatePipelinesWithCoverage(queryContext, repoIds),
      getQueryPeriodPipelinesWithCoverage(queryContext, repoIds),
    ]);

  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);

  const missingDaysPipelinesCount = range(0, numberOfIntervals).map(weekIndex => {
    return (
      queryPeriodPipelinesWithCoverage.find(day => day.weekIndex === weekIndex) || {
        weekIndex,
        defsWithCoverage: [],
      }
    );
  });
  const defsWithCoverageSet = new Set(
    preStartDatePipelinesWithCoverage.defsWithCoverage || []
  );

  return missingDaysPipelinesCount
    .map(day => {
      day.defsWithCoverage.forEach(id => {
        defsWithCoverageSet.add(id);
      });

      return {
        weekIndex: day.weekIndex,
        defsWithCoverage: defsWithCoverageSet.size,
      };
    })
    .slice(numberOfIntervals - Math.floor(numberOfDays / 7));
};
