import { z } from 'zod';
import type { ObjectId } from 'mongoose';
import { collectionAndProjectInputs } from './helpers.js';
import { oneFortnightInMs } from '../../shared/utils.js';
import { repoDefaultBranch } from './repos.js';
import { BranchModel } from './mongoose-models/BranchModel.js';

export const branchStatsForRepo =
  (collectionName: string, project: string) => async (repositoryId: string) => {
    const result = await BranchModel.find({
      collectionName,
      project,
      repositoryId,
    }).lean();
    return result || [];
  };

export const getHealthyBranchesSummary = async ({
  collectionName,
  project,
  repoIds,
  defaultBranchIDs,
}: {
  collectionName: string;
  project: string;
  repoIds: string[];
  defaultBranchIDs: ObjectId[];
}) => {
  const today = new Date();
  const fifteenDaysBack = today.setDate(today.getDate() - 15);

  const result = await BranchModel.aggregate<{
    total: number;
    healthy: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repoIds },
      },
    },
    {
      $group: {
        _id: { collectionName: '$collectionName', project: '$project' },
        total: { $sum: 1 },
        healthy: {
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
                  { $in: ['$_id', defaultBranchIDs] },
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
        total: 1,
        healthy: 1,
      },
    },
  ]);

  return result[0] || { total: 0, healthy: 0 };
};

export const categoryAddFields = (startDate: Date, defaultBranch: string) => {
  const categoryFields = {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              {
                $and: [
                  { $lt: ['$aheadCount', 10] },
                  { $lt: ['$behindCount', 10] },
                  { $gte: ['$date', startDate] },
                ],
              },
              { $eq: ['$name', defaultBranch] },
            ],
          },
          then: 'healthy',
        },
        {
          case: {
            $and: [
              { $ne: ['$category', 'healthy'] },
              { $eq: ['$aheadCount', 0] },
              { $lt: ['$date', startDate] },
              { $ne: ['$name', defaultBranch] },
            ],
          },
          then: 'delete',
        },
        {
          case: {
            $and: [
              { $ne: ['$category', 'healthy'] },
              { $gt: ['$aheadCount', 0] },
              { $lt: ['$date', startDate] },
            ],
          },
          then: 'abandoned',
        },
      ],
      default: 'unhealthy',
    },
  };
  return categoryFields;
};

export const RepoTotalBranchesInputParser = z.object({
  ...collectionAndProjectInputs,
  repositoryId: z.string(),
});

export const getRepoBranchStats = async ({
  collectionName,
  project,
  repositoryId,
}: z.infer<typeof RepoTotalBranchesInputParser>) => {
  const today = new Date();
  const fifteenDaysBack = new Date(today.getTime() - oneFortnightInMs);

  const defaultBranch = await repoDefaultBranch(collectionName, project, repositoryId);

  if (!defaultBranch) return;

  const result = await BranchModel.aggregate<{
    totalBranches: number;
    totalHealthy: number;
    totalDelete: number;
    totalAbandoned: number;
    totalUnhealthy: number;
  }>([
    { $match: { collectionName, project, repositoryId } },
    {
      $addFields: {
        category: categoryAddFields(fifteenDaysBack, defaultBranch),
      },
    },
    {
      $group: {
        _id: null,
        totalBranches: { $sum: 1 },
        totalHealthy: {
          $sum: { $cond: [{ $eq: ['$category', 'healthy'] }, 1, 0] },
        },
        totalDelete: {
          $sum: { $cond: [{ $eq: ['$category', 'delete'] }, 1, 0] },
        },
        totalAbandoned: {
          $sum: { $cond: [{ $eq: ['$category', 'abandoned'] }, 1, 0] },
        },
        totalUnhealthy: {
          $sum: { $cond: [{ $eq: ['$category', 'unhealthy'] }, 1, 0] },
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
  // /?version=GBMultidevice-fix2
  const branchUrl = `${repoUrl}/?_a=${linkType}&version=GB${encodeURIComponent(
    branchName
  )}`;

  return branchUrl;
};

export const BranchesListInputParser = z.object({
  ...collectionAndProjectInputs,
  repositoryId: z.string(),
  repoUrl: z.string(),
  limit: z.number(),
});

export const getBranches =
  (
    category: 'healthy' | 'delete' | 'abandoned' | 'unhealthy',
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

    const defaultBranch = await repoDefaultBranch(collectionName, project, repositoryId);

    if (!defaultBranch) return;

    const result = await BranchModel.aggregate<{
      name: string;
      url: string;
      aheadCount: number;
      behindCount: number;
      lastCommitDate: Date;
    }>([
      { $match: { collectionName, project, repositoryId } },
      {
        $addFields: {
          category: categoryAddFields(fifteenDaysBack, defaultBranch),
        },
      },
      {
        $match: {
          category,
        },
      },
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
      { $sort: { lastCommitDate: -1 } },
    ]);

    const withUrls = result.map(branch => {
      return {
        ...branch,
        url: setBranchUrl(encodeURIComponent(branch.name), repoUrl, linkType),
      };
    });
    const updatedResult = {
      branches: withUrls || [],
      count: withUrls.length || 0,
      limit,
    };
    return updatedResult;
  };

export const getHealthyBranchesList = getBranches('healthy', 'contents');
export const getDeleteCandidateBranchesList = getBranches('delete', 'history');
export const getAbandonedBranchesList = getBranches('abandoned', 'history');
export const getUnhealthyBranchesList = getBranches('unhealthy', 'history');
