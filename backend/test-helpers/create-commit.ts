import { CommitModel } from '../models/mongoose-models/CommitModel.js';

export const createCommit = (
  collectionName: string,
  project: string,
  repositoryId: string,
  commitId: string,
  authorDate = new Date('2022-03-25')
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
        date: authorDate,
        imageUrl: 'https://example.com',
      },
      changeCounts: { add: 0, edit: 5, delete: 0 },
      committer: {
        name: 'Jon Doe',
        email: 'jondoe@email.com',
        date: authorDate,
        imageUrl: 'https://example.com',
      },
      remoteUrl: 'https://example.com',

      url: 'https://example.com',
    },
  ]);
};
