import React from 'react';
import prettyMilliseconds from 'pretty-ms';
import { byNum, byString } from 'sort-lib';
import { GitPullRequest } from 'react-feather';
import { relativeTime, num, shortDate } from '../../helpers/utils.js';
import type { Tab } from './Tab.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import BuildInsights from './BuildInsights.jsx';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext, useQueryPeriodDays } from '../../hooks/query-hooks.js';
import SortableTable from '../common/SortableTable.jsx';
import { SadEmpty } from '../repo-summary/Empty.jsx';
import CentralTemplateUsage from '../CentralTemplateUsage.jsx';

const BuildInsightsWrapper = ({
  item,
}: {
  item: RouterClient['builds']['getBuildsOverviewForRepository'][number];
}) => {
  return <BuildInsights buildDefinitionId={item.buildDefinitionId} />;
};

const Builds: React.FC<{
  repositoryId: string;
}> = ({ repositoryId }) => {
  const queryPeriodDays = useQueryPeriodDays();

  const builds = trpc.builds.getBuildsOverviewForRepository.useQuery({
    queryContext: useQueryContext(),
    repositoryId,
  });

  if (builds.data?.length === 0) {
    return (
      <div className="bg-theme-hover">
        <SadEmpty
          heading="No build pipelines"
          body="There are no build pipelines configured for this repository"
        />
      </div>
    );
  }

  return (
    <div>
      <SortableTable
        variant="default"
        data={builds.data}
        rowKey={row => row.buildDefinitionId.toString()}
        defaultSortColumnIndex={2}
        ChildComponent={BuildInsightsWrapper}
        hasChild={row => row.totalBuilds !== 0}
        additionalRowClassName={row => (row.totalBuilds === 0 ? 'opacity-60' : '')}
        columns={[
          {
            title: 'Pipeline',
            key: 'pipeline',
            // eslint-disable-next-line react/no-unstable-nested-components
            value: row => (
              <span className="inline-grid grid-flow-col items-center">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={row.definitionName}
                  className="link-text truncate max-w-xs inline-block"
                >
                  {row.definitionName}
                </a>
                {row.ui ? (
                  <span
                    className="inline-block ml-2 uppercase text-xs px-1.5 py-0.5 bg-theme-danger-dim rounded-sm text-theme-danger font-semibold"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content="This pipeline is configured using the UI instead of a YAML file"
                  >
                    UI
                  </span>
                ) : null}
                {row.type === 'recent' ? (
                  <span
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content={`${num(
                      row.prCount
                    )} builds triggered by pull requests`}
                  >
                    <GitPullRequest
                      size={20}
                      className="inline-block ml-2 -mt-1 text-theme-icon"
                    />
                  </span>
                ) : null}
              </span>
            ),
            sorter: byString(x => x.definitionName.toLocaleLowerCase()),
          },
          {
            title: 'Central template',
            key: 'central template',
            // eslint-disable-next-line react/no-unstable-nested-components
            value: row => (
              <CentralTemplateUsage
                buildDefinitionId={String(row.buildDefinitionId)}
                centralTemplateRuns={row.centralTemplateCount}
                mainBranchCentralTemplateBuilds={row.mainBranchCentralTemplateBuilds}
                totalRuns={row.totalBuilds}
              />
            ),
            sorter: byNum(x => divide(x.centralTemplateCount, x.totalBuilds).getOr(0)),
          },
          {
            title: 'Runs',
            key: 'runs',
            value: row => (row.type === 'old' ? '-' : num(row?.totalBuilds)),
            sorter: byNum(row => (row.type === 'old' ? -100 : row?.totalBuilds)),
          },
          {
            title: 'Success rate',
            key: 'success rate',
            // eslint-disable-next-line react/no-unstable-nested-components
            value: row => (
              <span
                {...(row.type === 'old'
                  ? {}
                  : {
                      'data-tooltip-id': 'react-tooltip',
                      'data-tooltip-html': `${num(
                        row.totalSuccessfulBuilds
                      )} successful builds`,
                    })}
              >
                {row.type === 'old'
                  ? '-'
                  : divide(row.totalSuccessfulBuilds, row.totalBuilds)
                      .map(toPercentage)
                      .getOr('-')}
              </span>
            ),
            sorter: byNum(row =>
              row.type === 'old'
                ? -100
                : divide(row.totalSuccessfulBuilds, row.totalBuilds).getOr(0)
            ),
          },
          {
            title: 'Average duration',
            key: 'average duration',
            // eslint-disable-next-line react/no-unstable-nested-components
            value: row =>
              row.type === 'old' || row.averageDuration === 0 ? (
                '-'
              ) : (
                <span
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={`${prettyMilliseconds(
                    row.minDuration
                  )} - ${prettyMilliseconds(row.maxDuration)}`}
                >
                  {prettyMilliseconds(row.averageDuration)}
                </span>
              ),
            sorter: byNum(row =>
              row.type === 'old' || row.averageDuration === 0 ? -100 : row.averageDuration
            ),
          },
          {
            title: 'Current status',
            key: 'current status',
            // eslint-disable-next-line react/no-unstable-nested-components
            value: pipeline => (
              <>
                {pipeline.type === 'recent' &&
                  pipeline.lastBuildStatus === 'succeeded' && (
                    <>
                      <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2">
                        {' '}
                      </span>
                      <span className="capitalize">{pipeline.lastBuildStatus}</span>{' '}
                      <span
                        data-tooltip-id="react-tooltip"
                        data-tooltip-content={`${shortDate(
                          new Date(pipeline.lastBuildTimestamp)
                        )}, ${new Date(pipeline.lastBuildTimestamp).getFullYear()}`}
                      >
                        {relativeTime(new Date(pipeline.lastBuildTimestamp))}
                      </span>
                    </>
                  )}
                {pipeline.type === 'recent' &&
                (pipeline.lastBuildStatus === 'failed' ||
                  pipeline.lastBuildStatus === 'canceled' ||
                  pipeline.lastBuildStatus === 'partiallySucceeded') ? (
                  <>
                    <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2">
                      {' '}
                    </span>
                    <span>
                      {`Failing since ${shortDate(
                        new Date(pipeline.failingSince.timestamp)
                      )}`}
                    </span>
                  </>
                ) : undefined}
                {pipeline.type === 'old' ? (
                  <>
                    <span className="bg-gray-500 w-2 h-2 rounded-full inline-block mr-2">
                      {' '}
                    </span>
                    <span>
                      {`Last used ${
                        pipeline.latestBuildTime
                          ? `${shortDate(new Date(pipeline.latestBuildTime))}, ${new Date(
                              pipeline.latestBuildTime
                            ).getFullYear()}`
                          : 'unknown'
                      }`}
                    </span>
                  </>
                ) : undefined}
              </>
            ),
          },
        ]}
      />
      <div className="w-full text-sm italic text-theme-icon py-2 px-7">
        {`* Data shown is for the last ${queryPeriodDays} days`}
      </div>
    </div>
  );
};

export default (repositoryId: string, buildsCount?: number): Tab => {
  return {
    title: 'Builds',
    count: buildsCount ?? 0,
    Component: () => <Builds repositoryId={repositoryId} />,
  };
};
