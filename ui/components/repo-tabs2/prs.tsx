import React from 'react';
import prettyMilliseconds from 'pretty-ms';
import { num } from '../../helpers/utils.js';
import type { Tab } from './Tabs.jsx';
import Metric from '../Metric.jsx';
import TabContents from './TabContents.jsx';
import useQueryParam, { asBoolean } from '../../hooks/use-query-param.js';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';

export default (repositoryId: string, totalPullRequests?: number): Tab => ({
  title: 'Pull requests',
  count: totalPullRequests ?? 0,
  Component: () => {
    const [showNewPrs] = useQueryParam('pr-v2', asBoolean);
    const pullRequest = trpc.pullRequests.getPullRequestsSummaryForRepo.useQuery({
      queryContext: useQueryContext(),
      repositoryId,
    });
    return showNewPrs && pullRequest.data ? (
      <>
        <hr className="mt-2" />
        <h2 className="text-xl font-bold text-center mb-2 mt-2 text-lime-500">PR v2</h2>
        <hr className="mb-2" />
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
      </>
    ) : (
      <div>No pull requests for this repository</div>
    );
  },
});
