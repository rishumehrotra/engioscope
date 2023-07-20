import { z } from 'zod';
import type { PipelineStage } from 'mongoose';
import type { GitCommitRef } from '../scraper/types-azure.js';
import { CommitModel } from './mongoose-models/CommitModel.js';
import { inDateRange } from './helpers.js';
import { getConfig } from '../config.js';
import type { QueryContext } from './utils.js';
import { queryContextInputParser, fromContext } from './utils.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import { oneWeekInMs } from '../../shared/utils.js';

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

export const repoCommitsDetailsInputParser = z.object({
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
}: z.infer<typeof repoCommitsDetailsInputParser>) => {
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
export const devCommitsDetailsInputParser = repoCommitsDetailsInputParser.extend({
  authorEmail: z.string(),
});

export type AuthorCommitDetails = {
  totalAdd: number;
  totalEdit: number;
  totalDelete: number;
  repoCommits: number;
  totalCommits: number;
  authorName: string;
  authorImageUrl: string;
  authorEmail: string;
  totalReposCommitted: number;
  latestCommit: Date;
};

export const getRepoCommitsDetailsForAuthorEmail = ({
  queryContext,
  repositoryId,
  authorEmail,
}: z.infer<typeof devCommitsDetailsInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return CommitModel.aggregate<AuthorCommitDetails>([
    {
      $match: {
        collectionName,
        project,
        'author.date': inDateRange(startDate, endDate),
      },
    },
    { $addFields: { authorEmail: { $toLower: '$author.email' } } },
    { $match: { authorEmail } },
    { $sort: { 'author.date': -1 } },
    {
      $group: {
        _id: '$authorEmail',
        repoCommits: {
          $sum: { $cond: [{ $eq: ['$repositoryId', repositoryId] }, 1, 0] },
        },
        totalCommits: { $sum: 1 },
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
        authorName: { $first: '$author.name' },
        authorImageUrl: { $first: '$author.imageUrl' },
        authorEmail: { $first: '$authorEmail' },
        latestCommit: { $first: '$author.date' },
      },
    },
    { $addFields: { totalReposCommitted: { $size: '$allRepos' } } },
    {
      $project: {
        _id: 0,
        allRepos: 0,
      },
    },
  ])
    .exec()
    .then(x => x[0]);
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

const devSortKeys = [
  'authorName',
  'totalReposCommitted',
  'totalAdd',
  'totalDelete',
] as const;

export type DevSortKey = (typeof devSortKeys)[number];

const getUniqueDevsCommittedToRepo = async (
  queryContext: QueryContext,
  repositoryName: string
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const repositoryId = await RepositoryModel.findOne<{ id: string }>(
    {
      collectionName,
      'project.name': project,
      'name': repositoryName,
    },
    {
      _id: 0,
      id: 1,
    }
  )
    .exec()
    .then(x => x?.id);

  if (!repositoryId) {
    return [];
  }

  return CommitModel.aggregate<{ authorEmail: string }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        'author.date': inDateRange(startDate, endDate),
      },
    },
    { $addFields: { authorEmail: { $toLower: '$author.email' } } },
    { $group: { _id: '$authorEmail' } },
    { $project: { _id: 0, authorEmail: '$_id' } },
  ])
    .exec()
    .then(x => x.map(x => x.authorEmail));
};

const repoSearchTermHelper = async (queryContext: QueryContext, searchTerm: string) => {
  if (searchTerm === '') {
    return { isRepoSearch: false, repoSearchTerm: undefined, devEmails: undefined };
  }

  const isRepoSearch = searchTerm?.includes('repo:');
  const repoSearchTerm = isRepoSearch
    ? searchTerm?.replaceAll('repo:', '').replaceAll('"', '')
    : undefined;

  const devEmails = repoSearchTerm
    ? await getUniqueDevsCommittedToRepo(queryContext, repoSearchTerm)
    : undefined;

  return { isRepoSearch, repoSearchTerm, devEmails };
};

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
  repoUrl: string;
  repoDailyCommits: DailyCommit[];
  repoCommitsCount: number;
  authorEmail: string;
  authorName: string;
  repositoryId: string;
  repoAdd: number;
  repoEdit: number;
  repoDelete: number;
  latestCommit: Date;
};

type DevListing = {
  totalCommits: number;
  totalAdd: number;
  totalEdit: number;
  totalDelete: number;
  allCommits: AllCommits[];
  authorEmail: string;
  authorName: string;
  authorImage: string;
  lowerAuthorName: string;
  lowerAuthorEmail: string;
  latestCommit: Date;
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
  const { isRepoSearch, devEmails } = await repoSearchTermHelper(
    queryContext,
    searchTerm || ''
  );

  const sortStage: PipelineStage = {
    $sort: {
      ...(!sortBy || sortBy === 'authorName'
        ? { lowerAuthorName: sortOrderNum }
        : {
            [sortBy]: sortOrderNum,
          }),
      lowerAuthorEmail: sortDirection === 'desc' ? -1 : 1,
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
          'author.email': { $exists: true },
          ...(searchTerm && !isRepoSearch
            ? { 'author.name': { $regex: new RegExp(searchTerm, 'i') } }
            : {}),
        },
      },
      {
        $addFields: {
          ...(searchTerm && isRepoSearch
            ? { lowerAuthorEmail: { $toLower: '$author.email' } }
            : {}),
          authorDate: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$author.date',
            },
          },
        },
      },
      ...(searchTerm && isRepoSearch && devEmails
        ? [{ $match: { lowerAuthorEmail: { $in: devEmails } } }]
        : []),
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
          latestCommit: { $max: '$author.date' },
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
          latestCommit: { $max: '$latestCommit' },
        },
      },
      {
        $group: {
          _id: {
            $toLower: '$authorEmail',
          },
          totalCommits: { $sum: '$repoCommitsCount' },
          totalAdd: { $sum: '$repoAdd' },
          totalEdit: { $sum: '$repoEdit' },
          totalDelete: { $sum: '$repoDelete' },
          allCommits: { $push: '$$ROOT' },
          authorEmail: { $first: '$authorEmail' },
          authorName: { $first: '$authorName' },
          authorImage: { $first: '$authorImage' },
          latestCommit: { $max: '$latestCommit' },
        },
      },
      {
        $project: {
          _id: 0,
          totalCommits: 1,
          totalAdd: 1,
          totalEdit: 1,
          totalDelete: 1,
          totalReposCommitted: { $size: '$allCommits' },
          allCommits: 1,
          authorEmail: 1,
          authorName: 1,
          authorImage: 1,
          lowerAuthorName: { $toLower: '$authorName' },
          lowerAuthorEmail: { $toLower: '$authorEmail' },
          latestCommit: 1,
        },
      },
      sortStage,
      { $skip: pageSize * pageNumber },
      { $limit: pageSize },
    ]).exec(),
  ]);

  const findRepo = (repoId: string) => repos.find(repo => repo.id === repoId);
  const devCommits = commits.map(commit => {
    const allCommits = commit.allCommits.map(repo => {
      return {
        ...repo,
        repoName: findRepo(repo.repositoryId)?.name || '',
        repoUrl: findRepo(repo.repositoryId)?.url,
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
export const devFilterInputParser = z.object({
  queryContext: queryContextInputParser,
  searchTerm: z.string().optional(),
});
export const getFilteredDevCount = async ({
  queryContext,
  searchTerm,
}: z.infer<typeof devFilterInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { isRepoSearch, devEmails } = await repoSearchTermHelper(
    queryContext,
    searchTerm || ''
  );

  const filteredDevs = await CommitModel.aggregate([
    {
      $match: {
        collectionName,
        project,
        'author.date': inDateRange(startDate, endDate),
        '$and': [
          { 'author.email': { $exists: true } },
          ...(searchTerm && !isRepoSearch
            ? [{ 'author.name': { $regex: new RegExp(searchTerm, 'i') } }]
            : []),
        ],
      },
    },
    {
      $addFields: {
        ...(searchTerm && isRepoSearch
          ? { lowerAuthorEmail: { $toLower: '$author.email' } }
          : {}),
      },
    },
    ...(searchTerm && isRepoSearch && devEmails
      ? [{ $match: { lowerAuthorEmail: { $in: devEmails } } }]
      : []),

    { $group: { _id: { authorEmail: { $toLower: '$author.email' } } } },
  ])
    .count('total')
    .exec();

  return filteredDevs[0]?.total || 0;
};

export const getDevsCommittedToRepositoryIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return CommitModel.aggregate<{
    repositoryId: string;
    count: number;
    top: {
      name: string;
      email: string;
      imageUrl: string;
    }[];
  }>([
    {
      $match: {
        collectionName,
        project,
        'repositoryId': { $in: repositoryIds },
        'author.date': inDateRange(startDate, endDate),
        'author.email': { $exists: true },
      },
    },
    {
      $group: {
        _id: { repositoryId: '$repositoryId', email: { $toLower: '$author.email' } },
        name: { $first: '$author.name' },
        imageUrl: { $first: '$author.imageUrl' },
        totalCommits: { $sum: 1 },
      },
    },
    { $sort: { totalCommits: -1 } },
    {
      $group: {
        _id: '$_id.repositoryId',
        count: { $sum: 1 },
        devs: {
          $push: {
            name: '$name',
            email: '$_id.email',
            imageUrl: '$imageUrl',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        repositoryId: '$_id',
        count: 1,
        top: { $slice: ['$devs', 5] },
      },
    },
  ]);
};

export const getWeeklyCommitsForRepositoryIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return CommitModel.aggregate<{
    repositoryId: string;
    commits: {
      weekIndex: number;
      count: number;
    }[];
  }>([
    {
      $match: {
        collectionName,
        project,
        'repositoryId': { $in: repositoryIds },
        'author.date': inDateRange(startDate, endDate),
        'author.email': { $exists: true },
      },
    },
    { $sort: { authorDate: 1 } },
    {
      $group: {
        _id: {
          repositoryId: '$repositoryId',
          weekIndex: {
            $trunc: {
              $divide: [
                { $subtract: ['$author.date', new Date(startDate)] },
                oneWeekInMs,
              ],
            },
          },
        },
        totalCommits: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.repositoryId',
        repositoryId: { $first: '$_id.repositoryId' },
        commits: {
          $push: {
            weekIndex: '$_id.weekIndex',
            count: '$totalCommits',
          },
        },
      },
    },
  ]);
};
