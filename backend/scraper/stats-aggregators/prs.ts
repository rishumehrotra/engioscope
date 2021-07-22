import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import { GitPullRequest, PullRequestStatus } from '../types-azure';
import { Config } from '../types';
import { pastDate } from '../../utils';
import { UIPullRequests } from '../../../shared/types';

const isStatus = (status: PullRequestStatus) => (pr: GitPullRequest) => pr.status === status;
const isInTimeWindow = (pastDate: Date) => (pr: GitPullRequest) => (
  pastDate.getTime() < (pr.closedDate || pr.creationDate).getTime()
);

export default (config: Config) => (prs: GitPullRequest[]) => {
  const prsByRepo = prs.reduce((acc, pr) => ({
    ...acc,
    [pr.repository.id]: [
      ...(acc[pr.repository.id] || []),
      pr
    ]
  }), {} as Record<string, GitPullRequest[]>);

  return (repoId?: string): UIPullRequests => {
    const repoPrs = repoId ? prsByRepo[repoId] || [] : [];
    const activePrCount = repoPrs.filter(isStatus('active')).length;
    const prsInTimeWindow = repoPrs.filter(isInTimeWindow(pastDate(config.lookAtPast)));
    const abandonedPrCount = prsInTimeWindow.filter(isStatus('abandoned')).length;
    const completedPrs = prsInTimeWindow.filter(isStatus('completed'));

    const timesToApprove = completedPrs
      .map(pr => (pr.closedDate.getTime() - pr.creationDate.getTime()));

    const completedPrCount = completedPrs.length;

    return {
      total: activePrCount + completedPrCount,
      active: activePrCount,
      abandoned: abandonedPrCount,
      completed: completedPrCount,
      timeToApprove: timesToApprove.length === 0 ? null : {
        average: prettyMilliseconds(timesToApprove.reduce(add, 0) / timesToApprove.length, { unitCount: 2 }),
        min: prettyMilliseconds(Math.min(...timesToApprove), { unitCount: 2 }),
        max: prettyMilliseconds(Math.max(...timesToApprove), { unitCount: 2 })
      }
    };
  };
};
