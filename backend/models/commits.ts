import type { GitCommitRef } from '../scraper/types-azure.js';
import { CommitModel } from './mongoose-models/CommitModel.js';

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
