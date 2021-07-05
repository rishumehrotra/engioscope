/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GitPullRequest, PullRequestStatus } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { TopLevelIndicator } from '../../shared-types';
import ratingConfig from '../rating-config';
import { hours, statsStrings } from '../utils';
import { average, withOverallRating } from './ratings';

const [timeRange, averageTime] = statsStrings('-', hours);

export default (prs: GitPullRequest[]): TopLevelIndicator => {
  const prsByStatus = (status: PullRequestStatus) => prs.filter(pr => pr.status === status);
  const activePrCount = prsByStatus(PullRequestStatus.Active).length;
  const abandonedPrCount = prsByStatus(PullRequestStatus.Abandoned).length;

  const timesToApprove = prsByStatus(PullRequestStatus.Completed)
    .map(pr => (pr.closedDate!.getTime() - pr.creationDate!.getTime()));

  const completedPrCount = prsByStatus(PullRequestStatus.Completed).length;
  return withOverallRating({
    name: 'PR',
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
