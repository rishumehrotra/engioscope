import { add } from 'rambda';
import { AggregatedCommitsByDev, UICommits } from '../../../shared/types';
import { GitCommitRef } from '../types-azure';

const dateString = (date: Date) => date.toISOString().split('T')[0];

const mergeCommit = (commit: GitCommitRef, aggregatedCommits?: AggregatedCommitsByDev): AggregatedCommitsByDev => ({
  name: commit.committer.name,
  imageUrl: commit.committer.imageUrl,
  changes: {
    add: (aggregatedCommits?.changes.add || 0) + commit.changeCounts.Add,
    delete: (aggregatedCommits?.changes.delete || 0) + commit.changeCounts.Delete,
    edit: (aggregatedCommits?.changes.edit || 0) + commit.changeCounts.Edit
  },
  byDate: {
    ...aggregatedCommits?.byDate,
    [dateString(commit.committer.date)]: (aggregatedCommits?.byDate[dateString(commit.committer.date)] || 0) + 1
  }
});

export default (commits: GitCommitRef[]): UICommits => {
  const commitsByDev = commits.reduce((acc, commit) => {
    if (commit.comment.startsWith('Merge')) return acc;
    return {
      ...acc,
      [commit.committer.name]: mergeCommit(commit, acc[commit.committer.name])
    };
  },
  {} as Record<string, AggregatedCommitsByDev>);

  return {
    count: Object.values(commitsByDev).map(c => Object.values(c.byDate).reduce(add, 0)).reduce(add, 0),
    byDev: Object.values(commitsByDev)
      .sort((a, b) => (
        Object.values(b.byDate).reduce(add, 0) - Object.values(a.byDate).reduce(add, 0)
      ))
  };
};
