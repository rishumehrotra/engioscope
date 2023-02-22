import { sum } from 'rambda';
import { byNum, desc } from 'sort-lib';
import type { AggregatedCommitsByDev, UICommits } from '../../../shared/types.js';
import type { GitCommitRef } from '../types-azure.js';

const dateString = (date: Date) => date.toISOString().split('T')[0];

const mergeCommit = (
  commit: GitCommitRef,
  aggregatedCommits?: AggregatedCommitsByDev
): AggregatedCommitsByDev => ({
  name: commit.committer.name,
  imageUrl: commit.committer.imageUrl,
  changes: {
    add: (aggregatedCommits?.changes.add || 0) + (commit.changeCounts?.Add || 0),
    delete: (aggregatedCommits?.changes.delete || 0) + (commit.changeCounts?.Delete || 0),
    edit: (aggregatedCommits?.changes.edit || 0) + (commit.changeCounts?.Edit || 0),
  },
  byDate: {
    ...aggregatedCommits?.byDate,
    [dateString(commit.committer.date)]:
      (aggregatedCommits?.byDate[dateString(commit.committer.date)] || 0) + 1,
  },
});

export default (commits: GitCommitRef[]): UICommits => {
  const commitsByDev = commits.reduce<Record<string, AggregatedCommitsByDev>>(
    (acc, commit) => {
      if (!commit.changeCounts) return acc;

      acc[commit.committer.name] = mergeCommit(commit, acc[commit.committer.name]);
      return acc;
    },
    {}
  );

  return {
    count: sum(Object.values(commitsByDev).map(c => sum(Object.values(c.byDate)))),
    byDev: Object.values(commitsByDev).sort(
      desc(byNum(x => sum(Object.values(x.byDate))))
    ),
  };
};
