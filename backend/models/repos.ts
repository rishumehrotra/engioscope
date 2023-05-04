import type { ObjectId } from 'mongoose';
import { z } from 'zod';
import { collectionAndProjectInputs } from './helpers.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import { normalizeBranchName } from '../utils.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';

export const getRepositories = (collectionName: string, project: string) =>
  RepositoryModel.find({ collectionName, 'project.name': project }).lean();

export const getRepoCount = (collectionName: string, project: string) =>
  RepositoryModel.count({ collectionName, 'project.name': project })
    .lean()
    // Stupid mongoose types
    .then(x => x as unknown as number);

export const paginatedRepoListParser = z.object({
  ...collectionAndProjectInputs,
  searchTerm: z.string().optional(),
  cursor: z
    .object({
      pageSize: z.number().optional(),
      pageNumber: z.number().optional(),
    })
    .nullish(),
});

export const searchRepositories = (options: z.infer<typeof paginatedRepoListParser>) => {
  return RepositoryModel.find(
    {
      'collectionName': options.collectionName,
      'project.name': options.project,
      ...(options.searchTerm ? { name: new RegExp(options.searchTerm, 'i') } : {}),
    },
    { id: 1, name: 1, url: 1 }
  )
    .sort({ id: -1 })
    .skip((options.cursor?.pageNumber || 0) * (options.cursor?.pageSize || 5))
    .limit(options.cursor?.pageSize || 5);
};

export const getRepoIdByName = (
  collectionName: string,
  project: string,
  repoName: string
) =>
  RepositoryModel.findOne(
    {
      collectionName,
      'project.name': project,
      'name': repoName,
    },
    { id: 1 }
  )
    .lean()
    .then(x => x?.id);

export const getRepoById = (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  return RepositoryModel.findOne({
    collectionName,
    'project.name': project,
    'id': repositoryId,
  }).lean();
};

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
  return repoBranch?.defaultBranch
    ? normalizeBranchName(repoBranch.defaultBranch)
    : undefined;
};

export const getAllRepoDefaultBranchIDs = async (
  collectionName: string,
  project: string,
  repoIds: string[] | undefined
) => {
  const repoDefaultBranches = await RepositoryModel.aggregate<{
    repositoryId: string;
    defaultBranchName: string;
    defaultBranchId: ObjectId;
  }>([
    {
      $match: {
        collectionName,
        'project.name': project,
        'defaultBranch': { $exists: true },
        ...(repoIds ? { id: { $in: repoIds } } : {}),
      },
    },
    {
      $addFields: {
        defaultBranch: {
          $replaceAll: {
            input: '$defaultBranch',
            find: 'refs/heads/',
            replacement: '',
          },
        },
      },
    },
    {
      $lookup: {
        from: 'branches',
        let: {
          id: '$id',
          defaultBranch: '$defaultBranch',
        },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: {
                $and: [
                  { $eq: ['$repositoryId', '$$id'] },
                  { $eq: ['$name', '$$defaultBranch'] },
                ],
              },
            },
          },
        ],
        as: 'result',
      },
    },
    {
      $project: {
        _id: 0,
        repositoryId: '$id',
        defaultBranchName: {
          $arrayElemAt: ['$result.name', 0],
        },
        defaultBranchId: {
          $arrayElemAt: ['$result._id', 0],
        },
      },
    },
    {
      $match: {
        defaultBranchId: {
          $exists: true,
        },
      },
    },
  ]);

  return repoDefaultBranches.map(repo => repo.defaultBranchId);
};

export const getTotalReposInProject = (collectionName: string, project: string) =>
  RepositoryModel.countDocuments({
    collectionName,
    'project.name': project,
  });

export const getDefaultBranchAndNameForRepoIds = (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  return RepositoryModel.find(
    { collectionName, 'project.name': project, 'id': { $in: repositoryIds } },
    { id: 1, name: 1, defaultBranch: 1 }
  );
};
