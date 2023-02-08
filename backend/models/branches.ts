import mongoose from 'mongoose';
import type { GitBranchStats } from '../scraper/types-azure.js';

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

export const healthyBranchesSummary = async (collectionName: string, project: string) => {
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

export const getRepoTotalBranches = async (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  const result = await BranchModel.countDocuments({
    collectionName,
    project,
    repositoryId,
  });

  return result || 0;
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
export const getHealthyBranchList = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  repoUrl: string,
  limit: number
) => {
  const today = new Date();
  const fifteenDaysBack = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);

  const result = await BranchModel.aggregate<{
    name: string;
    url: string;
    aheadCount: number;
    behindCount: number;
    lastCommit: Date;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        aheadCount: { $lt: 10 },
        behindCount: { $lt: 10 },
        date: { $gte: fifteenDaysBack },
      },
    },
    {
      $project: {
        _id: 0,
        aheadCount: 1,
        behindCount: 1,
        lastCommit: '$date',
        name: 1,
      },
    },
    {
      $limit: limit,
    },
    {
      $sort: {
        lastCommit: -1,
      },
    },
  ]);

  const updatedResult = result.map(branch => {
    return {
      ...branch,
      url: setBranchUrl(encodeURIComponent(branch.name), repoUrl, 'contents'),
    };
  });

  return updatedResult;
};

export const getDeleteCandidateBranchList = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  repoUrl: string,
  limit: number
) => {
  const today = new Date();
  const fifteenDaysBack = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
  const result = await BranchModel.aggregate<{
    name: string;
    url: string;
    aheadCount: number;
    behindCount: number;
    lastCommit: Date;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        name: { $ne: 'main' },
        aheadCount: { $eq: 0 },
        date: { $lt: fifteenDaysBack },
      },
    },
    {
      $project: {
        _id: 0,
        aheadCount: 1,
        behindCount: 1,
        lastCommit: '$date',
        name: 1,
      },
    },
    {
      $limit: limit,
    },
    {
      $sort: {
        lastCommit: -1,
      },
    },
  ]);
  const updatedResult = result.map(branch => {
    return {
      ...branch,
      url: setBranchUrl(encodeURIComponent(branch.name), repoUrl, 'history'),
    };
  });

  return updatedResult;
};

export const getAbandonedBranchList = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  repoUrl: string,
  limit: number
) => {
  const today = new Date();
  const fifteenDaysBack = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
  const result = await BranchModel.aggregate<{
    name: string;
    url: string;
    aheadCount: number;
    behindCount: number;
    lastCommit: Date;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        name: { $ne: 'main' },
        aheadCount: { $gte: 0 },
        date: { $lt: fifteenDaysBack },
      },
    },
    {
      $project: {
        _id: 0,
        aheadCount: 1,
        behindCount: 1,
        lastCommit: '$date',
        name: 1,
      },
    },
    {
      $limit: limit,
    },
    {
      $sort: {
        lastCommit: -1,
      },
    },
  ]);
  const updatedResult = result.map(branch => {
    return {
      ...branch,
      url: setBranchUrl(encodeURIComponent(branch.name), repoUrl, 'history'),
    };
  });

  return updatedResult;
};

export const getUnhealthyBranchList = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  repoUrl: string,
  limit: number
) => {
  const today = new Date();
  const fifteenDaysBack = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
  const result = await BranchModel.aggregate<{
    name: string;
    url: string;
    aheadCount: number;
    behindCount: number;
    lastCommit: Date;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        name: { $ne: 'main' },
        $or: [
          { aheadCount: { $gte: 0 } },
          { behindCount: { $gte: 0 } },
          {
            date: { $lt: fifteenDaysBack },
          },
        ],
      },
    },

    {
      $project: {
        _id: 0,
        aheadCount: 1,
        behindCount: 1,
        lastCommit: '$date',
        name: 1,
      },
    },
    {
      $limit: limit,
    },
    {
      $sort: {
        lastCommit: -1,
      },
    },
  ]);
  const updatedResult = result.map(branch => {
    return {
      ...branch,
      url: setBranchUrl(encodeURIComponent(branch.name), repoUrl, 'history'),
    };
  });

  return updatedResult;
};
