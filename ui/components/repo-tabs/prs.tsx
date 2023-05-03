import React from 'react';
import prettyMilliseconds from 'pretty-ms';
import type { RepoAnalysis } from '../../../shared/types.js';
import { num } from '../../helpers/utils.js';
import type { Tab } from './Tabs.js';
import Metric from '../Metric.js';
import TabContents from './TabContents.js';
import useQueryParam, { asBoolean } from '../../hooks/use-query-param.js';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';

export default (repositoryId: string, prs: RepoAnalysis['prs']): Tab => ({
  title: 'Pull requests',
  count: prs.total,
  Component: () => {
    const [showNewPrs] = useQueryParam('pr-v2', asBoolean);
    const pullRequest = trpc.pullRequests.getPullRequestsSummaryForRepo.useQuery(
      {
        queryContext: useQueryContext(),
        repositoryId,
      },
      {
        enabled: showNewPrs === true,
      }
    );
    return (
      <>
        {showNewPrs && (
          <>
            <hr className="mt-2" />
            <h2 className="text-xl font-bold text-center mb-2 mt-2 text-lime-500">
              PR v1
            </h2>
            <hr className="mb-2" />
          </>
        )}
        <TabContents gridCols={4}>
          <Metric name="Active" value={num(prs.active)} position="first" />
          <Metric name="Abandoned" value={num(prs.abandoned)} />
          <Metric name="Completed" value={num(prs.completed)} />
          {prs.timeToApprove ? (
            <Metric
              name="Time to approve"
              value={prs.timeToApprove.average}
              additionalValue={`${prs.timeToApprove.min} - ${prs.timeToApprove.max}`}
              position="last"
            />
          ) : (
            <Metric name="Time to approve" value="-" position="last" />
          )}
        </TabContents>
        {showNewPrs && pullRequest.data && (
          <>
            <hr className="mt-2" />
            <h2 className="text-xl font-bold text-center mb-2 mt-2 text-lime-500">
              PR v2
            </h2>
            <hr className="mb-2" />
            <TabContents gridCols={4}>
              <Metric
                name="Active"
                value={num(pullRequest.data.active)}
                position="first"
              />
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
        )}
      </>
    );
  },
});
