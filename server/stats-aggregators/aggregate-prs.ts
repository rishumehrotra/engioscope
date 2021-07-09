/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GitPullRequest, PullRequestStatus } from '../network/azure-types';
import ratingConfig from '../rating-config';
import { hours, statsStrings } from '../utils';
import { average, withOverallRating } from './ratings';

const [timeRange, averageTime] = statsStrings('-', hours);

export default (prs: GitPullRequest[]) => {
  const prsByRepo = prs.reduce((acc, pr) => ({
    ...acc,
    [pr.repository.id]: [
      ...(acc[pr.repository.id] || []),
      pr
    ]
  }), {} as Record<string, GitPullRequest[]>);

  return (repoId?: string) => {
    const repoPrs = repoId ? prsByRepo[repoId] || [] : [];
    const prsByStatus = (status: PullRequestStatus) => repoPrs.filter(pr => pr.status === status);
    const activePrCount = prsByStatus('active').length;
    const abandonedPrCount = prsByStatus('abandoned').length;

    const timesToApprove = prsByStatus('completed')
      .map(pr => (pr.closedDate!.getTime() - pr.creationDate!.getTime()));

    const completedPrCount = prsByStatus('completed').length;

    return withOverallRating({
      name: 'Pull requests',
      count: activePrCount + completedPrCount,
      indicators: [
        {
          name: 'Active',
          value: activePrCount,
          rating: ratingConfig.pr.active(activePrCount)
        },
        {
          name: 'Abandoned',
          value: abandonedPrCount,
          rating: ratingConfig.pr.abandoned(abandonedPrCount)
        },
        {
          name: 'Completed',
          value: completedPrCount,
          rating: ratingConfig.pr.completed(completedPrCount)
        },
        {
          name: 'Time to approve',
          value: averageTime(timesToApprove),
          rating: ratingConfig.pr.timeToApprove(average(timesToApprove)),
          additionalValue: timeRange(timesToApprove)
        }
      ]
    });
  };
};
