import { z } from 'zod';
import type { PipelineStage } from 'mongoose';
import type { GitCommitRef } from '../scraper/types-azure.js';
import { CommitModel } from './mongoose-models/CommitModel.js';
import { inDateRange } from './helpers.js';
import { getConfig } from '../config.js';
import type { QueryContext } from './utils.js';
import { queryContextInputParser, fromContext } from './utils.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';

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
  queryContext: queryContextInputParser,
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

export const getRepoCommitsDetails = ({
  queryContext,
  repositoryId,
}: z.infer<typeof RepoCommitsDetailsInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return CommitModel.aggregate<CommitDetails>([
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
    { $unwind: { path: '$commits' } },
    { $match: { 'commits.repositoryId': repositoryId } },
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
    { $sort: { '_id.authorDate': 1 } },
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
    { $sort: { repoCommits: -1 } },
  ]).exec();
};

export const getTotalCommitsForRepositoryIds = (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return CommitModel.aggregate<{
    repositoryId: string;
    count: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        'repositoryId': { $in: repositoryIds },
        'author.date': inDateRange(startDate, endDate),
      },
    },
    { $group: { _id: '$repositoryId', count: { $sum: 1 } } },
    {
      $project: {
        _id: 0,
        repositoryId: '$_id',
        count: 1,
      },
    },
  ]).exec();
};

const devSortKeys = ['authorName', 'totalReposCommitted'] as const;

export type DevSortKey = (typeof devSortKeys)[number];

export const devListingInputParser = z.object({
  queryContext: queryContextInputParser,
  searchTerm: z.string().optional(),
  pageSize: z.number(),
  pageNumber: z.number(),
  sortBy: z.enum(devSortKeys).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  cursor: z
    .object({
      pageSize: z.number().optional(),
      pageNumber: z.number().optional(),
    })
    .nullish(),
});

export type DevListingFilters = z.infer<typeof devListingInputParser>;

type DailyCommit = {
  dailyCommitsCount: number;
  dailyAdd: number;
  dailyEdit: number;
  dailyDelete: number;
  authorDate: string;
};

type AllCommits = {
  repoName: string;
  repoDailyCommits: DailyCommit[];
  repoCommitsCount: number;
  authorEmail: string;
  authorName: string;
  repositoryId: string;
  repoAdd: number;
  repoEdit: number;
  repoDelete: number;
};

export type DevListing = {
  totalCommits: number;
  allCommits: AllCommits[];
  authorEmail: string;
  authorName: string;
  authorImage: string;
  totalReposCommitted: number;
};
export const getSortedDevListing = async ({
  queryContext,
  searchTerm,
  sortBy,
  sortDirection,
  cursor,
}: z.infer<typeof devListingInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const sortOrderNum = sortDirection === 'asc' ? 1 : -1;
  const pageSize = cursor?.pageSize || 20;
  const pageNumber = cursor?.pageNumber || 0;

  const sortStage: PipelineStage = {
    $sort: {
      ...(!sortBy || sortBy === 'authorName'
        ? { authorName: sortOrderNum }
        : {
            [sortBy]: sortOrderNum,
          }),
      authorEmail: sortDirection === 'desc' ? -1 : 1,
    },
  };

  const [repos, commits] = await Promise.all([
    RepositoryModel.find({ collectionName, 'project.name': project }).lean(),

    CommitModel.aggregate<DevListing>([
      {
        $match: {
          collectionName,
          project,
          'author.date': inDateRange(startDate, endDate),
          '$and': [
            { 'author.email': { $exists: true } },
            ...(searchTerm
              ? [{ 'author.name': { $regex: new RegExp(searchTerm, 'i') } }]
              : []),
          ],
        },
      },
      {
        $addFields: {
          authorDate: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$author.date',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            authorEmail: {
              $toLower: '$author.email',
            },
            repositoryId: '$repositoryId',
            authorDate: '$authorDate',
          },
          dailyCommitsCount: { $sum: 1 },
          dailyAdd: { $sum: '$changeCounts.add' },
          dailyEdit: { $sum: '$changeCounts.edit' },
          dailyDelete: { $sum: '$changeCounts.delete' },
          authorEmail: { $first: '$author.email' },
          repositoryId: { $first: '$repositoryId' },
          authorDate: { $first: '$authorDate' },
          authorName: { $first: '$author.name' },
          authorImage: { $first: '$author.imageUrl' },
        },
      },
      {
        $group: {
          _id: {
            authorEmail: {
              $toLower: '$authorEmail',
            },
            repositoryId: '$repositoryId',
          },
          repoDailyCommits: {
            $push: {
              dailyCommitsCount: '$dailyCommitsCount',
              dailyAdd: '$dailyAdd',
              dailyEdit: '$dailyEdit',
              dailyDelete: '$dailyDelete',
              authorDate: '$authorDate',
            },
          },
          repoAdd: { $sum: '$dailyAdd' },
          repoEdit: { $sum: '$dailyEdit' },
          repoDelete: { $sum: '$dailyDelete' },
          repoCommitsCount: { $sum: '$dailyCommitsCount' },
          authorEmail: { $first: '$authorEmail' },
          repositoryId: { $first: '$repositoryId' },
          authorName: { $first: '$authorName' },
          authorImage: { $first: '$authorImage' },
        },
      },
      {
        $group: {
          _id: {
            $toLower: '$authorEmail',
          },
          totalCommits: { $sum: '$repoCommitsCount' },
          allCommits: { $push: '$$ROOT' },
          authorEmail: { $first: '$authorEmail' },
          authorName: { $first: '$authorName' },
          authorImage: { $first: '$authorImage' },
        },
      },
      {
        $project: {
          _id: 0,
          totalCommits: 1,
          totalReposCommitted: { $size: '$allCommits' },
          allCommits: 1,
          authorEmail: 1,
          authorName: 1,
          authorImage: 1,
        },
      },
      sortStage,
      { $skip: pageSize * pageNumber },
      { $limit: pageSize },
    ]).exec(),
  ]);

  const findRepoName = (repoId: string) => {
    const repo = repos.find(repo => repo.id === repoId);

    return repo ? repo.name : '';
  };

  const devCommits = commits.map(commit => {
    const allCommits = commit.allCommits.map(repo => {
      return {
        ...repo,
        repoName: findRepoName(repo.repositoryId),
      };
    });

    return {
      ...commit,
      allCommits,
    };
  });

  return {
    items: devCommits,
    nextCursor: {
      pageNumber: pageNumber + 1,
      pageSize,
    },
  };
};
