import { collectionsAndProjects, getConfig } from '../config.js';
import azure from '../scraper/network/azure.js';
import type { GitRepository } from '../scraper/types-azure.js';
import { runJob } from './utils.js';
import { RepositoryModel } from '../models/mongoose-models/RepositoryModel.js';
import { BuildModel } from '../models/mongoose-models/BuildModel.js';
import { RepoPolicyModel } from '../models/mongoose-models/RepoPoliciesModel.js';
import { CommitModel } from '../models/mongoose-models/CommitModel.js';

const deleteBuildsForRepoIds = (
  collectionName: string,
  project: string,
  ids: string[]
) => {
  return BuildModel.deleteMany({
    collectionName,
    project,
    'repository.id': { $in: ids },
  });
};

const deleteRepoPoliciesForRepoIds = (
  collectionName: string,
  project: string,
  ids: string[]
) => {
  return RepoPolicyModel.deleteMany({
    collectionName,
    project,
    repositoryId: { $in: ids },
  });
};

const deleteCommitsForRepoIds = (
  collectionName: string,
  project: string,
  repositoryIds: string[]
) =>
  CommitModel.deleteMany({
    collectionName,
    project,
    repositoryId: { $in: repositoryIds },
  });

const deleteRepositories = (collectionName: string, project: string, ids: string[]) => {
  return Promise.all([
    RepositoryModel.deleteMany({
      collectionName,
      'project.name': project,
      'id': { $in: ids },
    }),
    deleteBuildsForRepoIds(collectionName, project, ids),
    deleteRepoPoliciesForRepoIds(collectionName, project, ids),
    deleteCommitsForRepoIds(collectionName, project, ids),
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

export const getRepositories = async () => {
  const { getRepositories } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects().map(([collection, project]) =>
      getRepositories(collection.name, project.name).then(
        bulkSaveRepositories(collection.name)
      )
    )
  );
};

export default () => runJob('fetching repos', t => t.everyDayAt(22, 45), getRepositories);
