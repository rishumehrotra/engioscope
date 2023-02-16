import mongoose from 'mongoose';
import type { GitCommitRef } from '../scraper/types-azure.js';

const { Schema, model } = mongoose;

type CommitMeta = {
  name: string;
  email: string;
  date: Date;
  imageUrl: string;
};

export type Commit = {
  collectionName: string;
  project: string;
  repositoryId: string;
  commitId: string;
  author: CommitMeta;
  committer: CommitMeta;
  comment: string;
  changeCounts: {
    add: number;
    edit: number;
    delete: number;
  };
  url: string;
  remoteUrl: string;
};

const commitMeta = {
  name: { type: String },
  email: { type: String, required: true },
  date: { type: Date, required: true },
  imageUrl: { type: String },
};

const commitSchema = new Schema<Commit>(
  {
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    repositoryId: { type: String, required: true },
    commitId: { type: String, required: true },
    author: commitMeta,
    committer: commitMeta,
    changeCounts: {
      add: { type: Number, required: true },
      edit: { type: Number, required: true },
      delete: { type: Number, required: true },
    },
    url: { type: String, required: true },
    remoteUrl: { type: String, required: true },
  },
  { timestamps: true }
);

commitSchema.index({
  'collectionName': 1,
  'project': 1,
  'repositoryId': 1,
  'committer.date': 1,
});

const CommitModel = model<Commit>('Commit', commitSchema);

export const getLatestCommitIdAndDate = async (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  const result = await CommitModel.findOne(
    { collectionName, project, repositoryId },
    { 'commitId': 1, 'committer.date': 1 },
    { sort: { 'committer.date': -1 } }
  ).lean();
  if (!result) return;
  return {
    commitId: result.commitId,
    date: result.committer.date,
  };
};

export const bulkSaveCommits =
  (collectionName: string, project: string, repositoryId: string) =>
  (commits: GitCommitRef[]) => {
    return CommitModel.bulkWrite(
      commits.map(commit => {
        return {
          updateOne: {
            filter: {
              collectionName,
              project,
              repositoryId,
              commitId: commit.commitId,
            },
            update: {
              $set: {
                ...commit,
                changeCounts: {
                  add: commit.changeCounts.Add,
                  edit: commit.changeCounts.Edit,
                  delete: commit.changeCounts.Delete,
                },
              },
            },
            upsert: true,
          },
        };
      })
    );
  };

export const deleteCommitsForRepoIds = (
  collectionName: string,
  project: string,
  repositoryIds: string[]
) =>
  CommitModel.deleteMany({
    collectionName,
    project,
    repositoryId: { $in: repositoryIds },
  });
