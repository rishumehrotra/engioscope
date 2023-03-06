import { z } from 'zod';
import type { GitCommitRef } from '../scraper/types-azure.js';
import { CommitModel } from './mongoose-models/CommitModel.js';
import { collectionAndProjectInputs, dateRangeInputs, inDateRange } from './helpers.js';
import { getConfig } from '../config.js';

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
      commits
        .filter(commit => commit.changeCounts)
        .map(commit => {
          if (!commit.changeCounts) throw new Error('Error to keep TS happy');
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

export const getCommits =
  (collectionName: string, project: string) => (repositoryId: string) => {
    const { queryFrom } = getConfig().azure;
    return CommitModel.find({
      collectionName,
      project,
      repositoryId,
      'author.date': { $gt: queryFrom },
    });
  };

export const RepoCommitsDetailsInputParser = z.object({
  repositoryId: z.string(),
  ...collectionAndProjectInputs,
  ...dateRangeInputs,
});

export type CommitDetails = {
  _id: string;
  daily: {
    date: string;
    total: number;
  }[];
  totalAdd: number;
  totalEdit: number;
  totalDelete: number;
  repoCommits: number;
  otherCommits: number;
  authorName: string;
  authorImageUrl: string;
  authorEmail: string;
  allRepos: string[];
};

export const getRepoCommitsDetails = async ({
  collectionName,
  project,
  repositoryId,
  startDate,
  endDate,
}: z.infer<typeof RepoCommitsDetailsInputParser>) => {
  const result = await CommitModel.aggregate<CommitDetails>([
    {
      $match: {
        collectionName,
        project,
        'author.date': inDateRange(startDate, endDate),
      },
    },
    {
      $addFields: {
        authorDate: { $dateToString: { format: '%Y-%m-%d', date: '$author.date' } },
        authorEmail: { $toLower: '$author.email' },
      },
    },
    {
      $group: {
        _id: '$authorEmail',
        repoCommits: {
          $sum: {
            $cond: [{ $eq: ['$repositoryId', repositoryId] }, 1, 0],
          },
        },
        otherCommits: {
          $sum: {
            $cond: [{ $ne: ['$repositoryId', repositoryId] }, 1, 0],
          },
        },
        totalAdd: {
          $sum: {
            $cond: [{ $eq: ['$repositoryId', repositoryId] }, '$changeCounts.add', 0],
          },
        },
        totalEdit: {
          $sum: {
            $cond: [{ $eq: ['$repositoryId', repositoryId] }, '$changeCounts.edit', 0],
          },
        },
        totalDelete: {
          $sum: {
            $cond: [{ $eq: ['$repositoryId', repositoryId] }, '$changeCounts.delete', 0],
          },
        },
        allRepos: { $addToSet: '$repositoryId' },
        commits: { $push: '$$ROOT' },
      },
    },
    {
      $unwind: { path: '$commits' },
    },
    {
      $match: { 'commits.repositoryId': repositoryId },
    },
    {
      $group: {
        _id: {
          authorEmail: '$_id',
          authorDate: '$commits.authorDate',
        },
        dailyCommit: { $sum: 1 },
        repoCommits: { $first: '$repoCommits' },
        otherCommits: { $first: '$otherCommits' },
        allRepos: { $first: '$allRepos' },
        authorName: { $first: '$commits.author.name' },
        authorImageUrl: { $first: '$commits.author.imageUrl' },
        totalAdd: { $first: '$totalAdd' },
        totalEdit: { $first: '$totalEdit' },
        totalDelete: { $first: '$totalDelete' },
      },
    },
    {
      $sort: { '_id.authorDate': 1 },
    },
    {
      $group: {
        _id: '$_id.authorEmail',
        daily: {
          $push: {
            date: '$_id.authorDate',
            total: '$dailyCommit',
          },
        },
        totalAdd: { $first: '$totalAdd' },
        totalEdit: { $first: '$totalEdit' },
        totalDelete: { $first: '$totalDelete' },
        repoCommits: { $first: '$repoCommits' },
        otherCommits: { $first: '$otherCommits' },
        authorName: { $first: '$authorName' },
        authorImageUrl: { $first: '$authorImageUrl' },
        authorEmail: { $first: '$_id.authorEmail' },
        allRepos: { $first: '$allRepos' },
      },
    },
    {
      $sort: { repoCommits: -1 },
    },
  ]);
  return result;
};

export const getRepoTotalCommits = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  startDate: Date,
  endDate: Date
) => {
  const result = await CommitModel.countDocuments({
    collectionName,
    project,
    repositoryId,
    'author.date': inDateRange(startDate, endDate),
  });

  return result;
};
