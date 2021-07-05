/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GitCommitRef } from 'azure-devops-node-api/interfaces/GitInterfaces';

type AggregatedCommits = {
  commitsByDev: Record<string, number>,
  latestCommitDate: Date | undefined,
  count: number
}

export default (commits: GitCommitRef[]): AggregatedCommits => ({
  count: commits.length,
  ...commits.reduce<Omit<AggregatedCommits, 'count'>>((acc, commit) => ({
    commitsByDev: {
      ...acc.commitsByDev,
      [commit.author!.name!]: (acc.commitsByDev[commit.author!.name!] || 0) + 1
    },
    latestCommitDate: acc.latestCommitDate !== undefined && acc.latestCommitDate.getTime() < commit.author!.date!.getTime()
      ? commit.author!.date
      : acc.latestCommitDate
  }), {
    commitsByDev: {},
    latestCommitDate: undefined
  })
});
