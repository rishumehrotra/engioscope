import { z } from 'zod';

import { configForProject } from '../config.js';
import { BuildModel } from './mongoose-models/BuildModel.js';
import { inDateRange } from './helpers.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import { CommitModel } from './mongoose-models/CommitModel.js';
import { unique } from '../utils.js';
import type { QueryContext } from './utils.js';
import { fromContext, queryContextInputParser } from './utils.js';

export const filteredReposInputParser = z.object({
  queryContext: queryContextInputParser,
  searchTerms: z.union([z.array(z.string()), z.undefined()]),
  groupsIncluded: z.union([z.array(z.string()), z.undefined()]),
});

const getGroupRepositoryNames = (
  collectionName: string,
  project: string,
  filterGroups: string[]
) => {
  const groups = configForProject(collectionName, project)?.groupRepos?.groups;
  if (!groups) return [];

  return filterGroups.flatMap(group => groups[group] || []);
};

export const isExactSearchString = (searchTerm: string) => {
  return searchTerm.startsWith('"') && searchTerm.endsWith('"');
};

export const searchAndFilterReposBy = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
}: z.infer<typeof filteredReposInputParser>) => {
  const { collectionName, project } = fromContext(queryContext);

  const groupRepositoryNames = groupsIncluded
    ? getGroupRepositoryNames(collectionName, project, groupsIncluded)
    : [];

  return RepositoryModel.find(
    {
      collectionName,
      'project.name': project,
      ...(groupRepositoryNames.length || (searchTerms && searchTerms.length > 0)
        ? {
            $and: [
              groupRepositoryNames.length ? { name: { $in: groupRepositoryNames } } : {},
              searchTerms && searchTerms.length > 0
                ? {
                    $or: searchTerms.map(term => {
                      if (isExactSearchString(term)) {
                        return { name: term.replaceAll('"', '') };
                      }
                      return { name: { $regex: new RegExp(term, 'i') } };
                    }),
                  }
                : {},
            ],
          }
        : {}),
    },
    { id: 1, name: 1 }
  ).lean();
};

export const getActiveRepos = async (
  queryContext: QueryContext,
  searchTerms: string[] | undefined,
  groupsIncluded: string[] | undefined
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const repos = await searchAndFilterReposBy({
    queryContext,
    searchTerms,
    groupsIncluded,
  });

  const [repoIdsFromBuilds, repoIdsFromCommits] = await Promise.all([
    BuildModel.aggregate<{ id: string }>([
      {
        $match: {
          collectionName,
          project,
          'repository.id': { $in: repos.map(r => r.id) },
          'finishTime': inDateRange(startDate, endDate),
        },
      },
      {
        $group: {
          _id: '$repository.id',
          name: { $first: '$repository.name' },
          buildsCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
        },
      },
    ]),
    CommitModel.distinct('repositoryId', {
      collectionName,
      project,
      'author.date': inDateRange(startDate, endDate),
      'repositoryId': { $in: repos.map(r => r.id) },
    }),
  ]);

  const activeRepoIds = unique([
    ...repoIdsFromBuilds.map(r => r.id),
    ...(repoIdsFromCommits as string[]),
  ]);

  return repos
    .filter(r => activeRepoIds.includes(r.id))
    .map(r => ({ id: r.id, name: r.name }));
};
