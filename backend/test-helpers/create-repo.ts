import { RepositoryModel } from '../models/mongoose-models/RepositoryModel.js';
import { generateRandomTestId } from './utils.js';

export const createRepo = (
  collectionName: string,
  project: string,
  repoId: string,
  defaultBranch = 'refs/heads/master'
) => {
  return RepositoryModel.insertMany([
    {
      id: repoId,
      name: 'repo-1',
      collectionName,
      project: {
        id: `project-${generateRandomTestId()}`,
        lastUpdatedTime: new Date('2022-01-01'),
        name: project,
        state: 'wellFormed',
        visibility: 'public',
      },
      remoteUrl: 'http://example.com/',
      size: 123,
      sshUrl: 'ssh://example.com',
      url: 'http://example.com',
      webUrl: 'http://example.com',
      defaultBranch,
    },
  ]);
};
