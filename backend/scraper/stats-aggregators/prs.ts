import { GitPullRequest, PullRequestStatus } from '../types-azure';
import { Config } from '../types';
import { hours, pastDate, statsStrings } from '../../utils';

const [timeRange, averageTime] = statsStrings('-', hours);

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

  return (repoId?: string) => {
    const repoPrs = repoId ? prsByRepo[repoId] || [] : [];
    const activePrCount = repoPrs.filter(isStatus('active')).length;
    const prsInTimeWindow = repoPrs.filter(isInTimeWindow(pastDate(config.lookAtPast)));
    const abandonedPrCount = prsInTimeWindow.filter(isStatus('abandoned')).length;
    const completedPrs = prsInTimeWindow.filter(isStatus('completed'));

    const timesToApprove = completedPrs
      .map(pr => (pr.closedDate.getTime() - pr.creationDate.getTime()));

    const completedPrCount = completedPrs.length;

    return {
      name: 'Pull requests',
      count: activePrCount + completedPrCount,
      indicators: [
        {
          name: 'Active',
          value: activePrCount
        },
        {
          name: 'Abandoned',
          value: abandonedPrCount
        },
        {
          name: 'Completed',
          value: completedPrCount
        },
        {
          name: 'Time to approve',
          value: averageTime(timesToApprove),
          additionalValue: timeRange(timesToApprove)
        }
      ]
    };
  };
};
