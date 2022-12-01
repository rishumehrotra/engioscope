import { model, Schema } from 'mongoose';
import type { GitRepository } from '../scraper/types-azure.js';

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
    name: { type: String, required: true }
  }
});

repositorySchema.index({
  'collectionName': 1,
  'id': 1,
  'project.id': 1
});

const RepositoryModel = model<Repository>('Repository', repositorySchema);

export const bulkSaveRepositories = (collectionName: string) => (repos: GitRepository[]) => (
  RepositoryModel.bulkWrite(repos.map(repo => {
    const { project, ...rest } = repo;

    return {
      updateOne: {
        filter: {
          collectionName,
          'id': repo.id,
          'project.id': project.id
        },
        update: { $set: { ...rest, project: { id: project.id, name: project.name } } },
        upsert: true
      }
    };
  }))
);
