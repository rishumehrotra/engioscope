import React from 'react';
import prettyMilliseconds from 'pretty-ms';
import { num } from '../../helpers/utils.js';
import type { Tab } from './Tabs.jsx';
import Metric from '../Metric.jsx';
import TabContents from './TabContents.jsx';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import Loading from '../Loading.jsx';

export default (repositoryId: string, totalPullRequests: number): Tab => ({
  title: 'Pull requests',
  count: totalPullRequests,
  Component: () => {
    const pullRequest = trpc.pullRequests.getPullRequestsSummaryForRepo.useQuery({
      queryContext: useQueryContext(),
      repositoryId,
    });

    if (!pullRequest.data) {
      return (
        <TabContents gridCols={1}>
          <Loading />
        </TabContents>
      );
    }

    return (
      <TabContents gridCols={4}>
        <Metric name="Active" value={num(pullRequest.data.active)} position="first" />
        <Metric name="Abandoned" value={num(pullRequest.data.abandoned)} />
        <Metric name="Completed" value={num(pullRequest.data.completed)} />
        {pullRequest.data.avgTime ? (
          <Metric
            name="Time to approve"
            value={prettyMilliseconds(pullRequest.data.avgTime, { unitCount: 2 })}
            additionalValue={`${prettyMilliseconds(pullRequest.data.minTime, {
              unitCount: 2,
            })} - ${prettyMilliseconds(pullRequest.data.maxTime, {
              unitCount: 2,
            })}`}
            position="last"
          />
        ) : (
          <Metric name="Time to approve" value="-" position="last" />
        )}
      </TabContents>
    );
  },
});
