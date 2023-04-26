import { model, Schema } from 'mongoose';

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
  'project.id': 1,
  'id': 1,
});

repositorySchema.index({
  'collectionName': 1,
  'project.id': 1,
  'name': 1,
});

repositorySchema.index({
  'collectionName': 1,
  'project.name': 1,
  'id': 1,
});

export const RepositoryModel = model<Repository>('Repository', repositorySchema);
