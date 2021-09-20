import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import type { GitPullRequest, PullRequestStatus } from '../types-azure';
import type { UIPullRequests } from '../../../shared/types';

const isStatus = (status: PullRequestStatus) => (pr: GitPullRequest) => pr.status === status;
const isInTimeWindow = (pastDate: Date) => (pr: GitPullRequest) => (
  pastDate.getTime() < (pr.closedDate || pr.creationDate).getTime()
);

export default (fromDate: Date) => (prs: GitPullRequest[]) => {
  const prsByRepo = prs.reduce<Record<string, GitPullRequest[]>>((acc, pr) => {
    acc[pr.repository.id] = (acc[pr.repository.id] || []).concat(pr);
    return acc;
  }, {});

  return (repoId?: string): UIPullRequests => {
    const repoPrs = repoId ? prsByRepo[repoId] || [] : [];
    const activePrCount = repoPrs.filter(isStatus('active')).length;
    const prsInTimeWindow = repoPrs.filter(isInTimeWindow(fromDate));
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
