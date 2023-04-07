import { CommitModel } from '../models/mongoose-models/CommitModel.js';

export const createCommit = (
  collectionName: string,
  project: string,
  repositoryId: string,
  commitId: string,
  authorDate: string,
  committerDate: string
) => {
  return CommitModel.insertMany([
    {
      collectionName,
      commitId,
      project,
      repositoryId,
      author: {
        name: 'Jon Doe',
        email: 'jondoe@email.com',
        date: new Date(authorDate),
        imageUrl: 'https://example.com',
      },
      changeCounts: { add: 0, edit: 5, delete: 0 },
      committer: {
        name: 'Jon Doe',
        email: 'jondoe@email.com',
        date: new Date(committerDate),
        imageUrl: 'https://example.com',
      },
      remoteUrl: 'https://example.com',

      url: 'https://example.com',
    },
  ]);
};
