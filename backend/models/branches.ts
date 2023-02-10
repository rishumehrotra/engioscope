import mongoose from 'mongoose';
import { z } from 'zod';
import type { PipelineStage } from 'mongoose';
import type { GitBranchStats } from '../scraper/types-azure.js';
import { collectionAndProjectInputs } from './helpers.js';
import { oneFortnightInMs } from '../../shared/utils.js';
import { RepositoryModel } from './repos.js';

const { Schema, model } = mongoose;

export type BranchStats = {
  collectionName: string;
  project: string;
  repositoryId: string;
  name: string;
  date: Date;
  aheadCount: number;
  behindCount: number;
  isBaseVersion: boolean;
};

const branchStatsSchema = new Schema<BranchStats>(
  {
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    repositoryId: { type: String, required: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    aheadCount: { type: Number, required: true },
    behindCount: { type: Number, required: true },
    isBaseVersion: { type: Boolean, required: true },
  },
  { timestamps: true }
);

branchStatsSchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
});

const BranchModel = model<BranchStats>('Branch', branchStatsSchema);

export const saveRepoBranch = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  branches: GitBranchStats[]
) => {
  await BranchModel.deleteMany({
    collectionName,
    project,
    repositoryId,
  });

  return BranchModel.insertMany(
    branches.map(branch => ({
      collectionName,
      project,
      repositoryId,
      ...branch,
      date: branch.commit.committer.date,
    }))
  );
};

export const branchUpdateDate = async (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  const result = await BranchModel.find(
    { collectionName, project, repositoryId },
    { date: 1 }
  )
    .sort({ date: -1 })
    .limit(1)
    .lean();

  return result[0]?.date as Date | undefined;
};

export const branchStatsForRepo =
  (collectionName: string, project: string) => async (repositoryId: string) => {
    const result = await BranchModel.find({
      collectionName,
      project,
      repositoryId,
    }).lean();
    return result || [];
  };

export const HealthyBranchesSummaryInputParser = z.object({
  ...collectionAndProjectInputs,
});
export const getHealthyBranchesSummary = async ({
  collectionName,
  project,
}: z.infer<typeof HealthyBranchesSummaryInputParser>) => {
  const today = new Date();
  const fifteenDaysBack = today.setDate(today.getDate() - 15);

  const result = await BranchModel.aggregate<{
    totalBranches: number;
    healthyBranches: number;
  }>([
    {
      $match: {
        collectionName,
        project,
      },
    },
    {
      $group: {
        _id: {
          collectionName: '$collectionName',
          project: '$project',
        },

        totalBranches: {
          $sum: 1,
        },

        healthyBranches: {
          $sum: {
            $cond: [
              {
                $or: [
                  {
                    $and: [
                      { $lt: ['$aheadCount', 10] },
                      { $lt: ['$behindCount', 10] },
                      {
                        $gte: ['$date', fifteenDaysBack],
                      },
                    ],
                  },
                  { $eq: ['$name', 'master'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalBranches: 1,
        healthyBranches: 1,
      },
    },
  ]);

  return result[0] || { totalBranches: 0, healthyBranches: 0 };
};

export const RepoTotalBranchesInputParser = z.object({
  ...collectionAndProjectInputs,
  repositoryId: z.string(),
});

export const repoDefaultBranch = async (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  const repoBranch = await RepositoryModel.findOne(
    {
      collectionName,
      'project.name': project,
      'id': repositoryId,
    },
    {
      defaultBranch: 1,
    }
  );
  return repoBranch;
};
export const getRepoBranchStats = async ({
  collectionName,
  project,
  repositoryId,
}: z.infer<typeof RepoTotalBranchesInputParser>) => {
  const today = new Date();
  const fifteenDaysBack = new Date(today.getTime() - oneFortnightInMs);

  const repo = await repoDefaultBranch(collectionName, project, repositoryId);

  if (!repo?.defaultBranch) {
    return {
      totalBranches: 0,
      totalHealthy: 0,
      totalDelete: 0,
      totalAbandoned: 0,
      totalUnhealthy: 0,
    };
  }

  const { defaultBranch } = repo;

  const result = await BranchModel.aggregate<{
    totalBranches: number;
    totalHealthy: number;
    totalDelete: number;
    totalAbandoned: number;
    totalUnhealthy: number;
  }>([
    { $match: { collectionName, project, repositoryId } },
    {
      $group: {
        _id: null,

        totalBranches: { $sum: 1 },

        totalHealthy: {
          $sum: {
            $cond: [
              {
                $or: [
                  {
                    $and: [
                      { $lt: ['$aheadCount', 10] },
                      { $lt: ['$behindCount', 10] },
                      { $gte: ['$date', fifteenDaysBack] },
                    ],
                  },
                  { $eq: ['$name', defaultBranch] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalDelete: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$aheadCount', 0] },
                  { $lt: ['$date', fifteenDaysBack] },
                  { $ne: ['$name', defaultBranch] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalAbandoned: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$aheadCount', 0] },
                  { $lt: ['$date', fifteenDaysBack] },
                  { $ne: ['$name', defaultBranch] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalUnhealthy: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $or: [
                      { $gte: ['$aheadCount', 0] },
                      { $gte: ['$behindCount', 0] },
                      { $lt: ['$date', fifteenDaysBack] },
                    ],
                  },
                  { $ne: ['$name', defaultBranch] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalBranches: 1,
        totalHealthy: 1,
        totalDelete: 1,
        totalAbandoned: 1,
        totalUnhealthy: 1,
      },
    },
  ]);

  return result[0];
};

export const setBranchUrl = (
  branchName: string,
  repoUrl: string,
  linkType: 'history' | 'contents'
) => {
  const branchUrl = `${repoUrl}/?_a=${linkType}&targetVersion=GB${encodeURIComponent(
    branchName
  )}`;

  return branchUrl;
};

const createMatcher =
  <T>(additionalClauses: (x: Date) => T) =>
  (
    collectionName: string,
    project: string,
    repositoryId: string,
    fifteenDaysBack: Date
  ): PipelineStage => ({
    $match: {
      collectionName,
      project,
      repositoryId,
      ...additionalClauses(fifteenDaysBack),
    },
  });

const matchers = {
  healthy: createMatcher(fifteenDaysBack => ({
    aheadCount: { $lt: 10 },
    behindCount: { $lt: 10 },
    date: { $gte: fifteenDaysBack },
  })),
  deleteCandidates: createMatcher(fifteenDaysBack => ({
    name: { $ne: 'main' },
    aheadCount: { $eq: 0 },
    date: { $lt: fifteenDaysBack },
  })),
  abandoned: createMatcher(fifteenDaysBack => ({
    name: { $ne: 'main' },
    aheadCount: { $gte: 0 },
    date: { $lt: fifteenDaysBack },
  })),
  unhealthy: createMatcher(fifteenDaysBack => ({
    name: { $ne: 'main' },
    $or: [
      { aheadCount: { $gte: 0 } },
      { behindCount: { $gte: 0 } },
      { date: { $lt: fifteenDaysBack } },
    ],
  })),
};

export const BranchesListInputParser = z.object({
  ...collectionAndProjectInputs,
  repositoryId: z.string(),
  repoUrl: z.string(),
  limit: z.number(),
});
export const getBranches =
  (
    matcher: (
      collectionName: string,
      project: string,
      repositoryId: string,
      fifteenDaysBack: Date,
      defaultBranch: string
    ) => PipelineStage,
    linkType: 'history' | 'contents'
  ) =>
  async ({
    collectionName,
    project,
    repositoryId,
    repoUrl,
    limit,
  }: z.infer<typeof BranchesListInputParser>) => {
    const today = new Date();
    const fifteenDaysBack = new Date(today.getTime() - oneFortnightInMs);

    const repo = await repoDefaultBranch(collectionName, project, repositoryId);

    if (!repo?.defaultBranch) {
      return {
        branches: [],
        count: 0,
        limit,
      };
    }

    const result = await BranchModel.aggregate<{
      name: string;
      url: string;
      aheadCount: number;
      behindCount: number;
      lastCommitDate: Date;
    }>([
      matcher(collectionName, project, repositoryId, fifteenDaysBack, repo.defaultBranch),
      {
        $project: {
          _id: 0,
          aheadCount: 1,
          behindCount: 1,
          lastCommitDate: '$date',
          name: 1,
        },
      },
      { $limit: limit },
      { $sort: { lastCommit: -1 } },
    ]);
    const addUrl = result.map(branch => {
      return {
        ...branch,
        url: setBranchUrl(encodeURIComponent(branch.name), repoUrl, linkType),
      };
    });
    const updatedResult = {
      branches: addUrl || [],
      count: addUrl.length || 0,
      limit,
    };
    return updatedResult;
  };

export const getHealthyBranchesList = getBranches(matchers.healthy, 'contents');
export const getDeleteCandidateBranchesList = getBranches(
  matchers.deleteCandidates,
  'history'
);
export const getAbandonedBranchesList = getBranches(matchers.abandoned, 'history');
export const getUnhealthyBranchesList = getBranches(matchers.unhealthy, 'history');
