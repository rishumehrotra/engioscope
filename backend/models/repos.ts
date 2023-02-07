import { model, Schema } from 'mongoose';
import { z } from 'zod';
import type { GitRepository } from '../scraper/types-azure.js';
import { deleteBuildsForRepoIds } from './builds.js';
import { collectionAndProjectInputs } from './helpers.js';
import { deleteRepoPoliciesForRepoIds } from './policy-configuration.js';

export type Repository = {
  collectionName: string;
  id: string;
  name: string;
  url: string;
  defaultBranch?: string;
  size: number;
  remoteUrl: string;
  sshUrl: string;
  webUrl: string;
  project: {
    id: string;
    name: string;
  };
};

const repositorySchema = new Schema<Repository>({
  collectionName: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  defaultBranch: { type: String },
  size: { type: Number, required: true },
  remoteUrl: { type: String, required: true },
  sshUrl: { type: String, required: true },
  webUrl: { type: String, required: true },
  project: {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
});

repositorySchema.index({
  'collectionName': 1,
  'id': 1,
  'project.id': 1,
});

export const RepositoryModel = model<Repository>('Repository', repositorySchema);

const deleteRepositories = (collectionName: string, project: string, ids: string[]) => {
  return Promise.all([
    RepositoryModel.deleteMany({
      collectionName,
      'project.name': project,
      'id': { $in: ids },
    }),
    deleteBuildsForRepoIds(collectionName, project, ids),
    deleteRepoPoliciesForRepoIds(collectionName, project, ids),
  ]);
};

export const bulkSaveRepositories =
  (collectionName: string) => async (repos: GitRepository[]) => {
    const existingRepoIds = repos.length
      ? (
          await RepositoryModel.find(
            { collectionName, 'project.id': repos[0].project.id },
            { id: 1 }
          ).lean()
        ).map(r => r.id)
      : [];

    const incomingRepoIds = new Set(repos.map(r => r.id));
    const deletedRepoIds = existingRepoIds.filter(id => !incomingRepoIds.has(id));

    return Promise.all([
      RepositoryModel.bulkWrite(
        repos.map(repo => {
          const { project, ...rest } = repo;

          return {
            updateOne: {
              filter: {
                collectionName,
                'id': repo.id,
                'project.id': project.id,
              },
              update: {
                $set: { ...rest, project: { id: project.id, name: project.name } },
              },
              upsert: true,
            },
          };
        })
      ),
      deleteRepositories(collectionName, repos[0]?.project.name, deletedRepoIds),
    ]);
  };

export const getRepositories = (collectionName: string, project: string) =>
  RepositoryModel.find({ collectionName, 'project.name': project }).lean();

export const getRepoCount = (collectionName: string, project: string) =>
  RepositoryModel.count({ collectionName, 'project.name': project }).lean();

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

export const searchRepositories = async (
  options: z.infer<typeof paginatedRepoListParser>
) => {
  const result = await RepositoryModel.find(
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

  return result;
};
