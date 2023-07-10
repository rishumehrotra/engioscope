import React, { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import prettyMilliseconds from 'pretty-ms';
import { byNum, byString } from 'sort-lib';
import { CheckCircle, GitPullRequest, XCircle } from 'react-feather';
import { relativeTime, num, shortDate } from '../../helpers/utils.js';
import type { Tab } from './Tabs.jsx';
import TabContents from './TabContents.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import BuildInsights from './BuildInsights.jsx';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject, useQueryContext } from '../../hooks/query-hooks.js';
import useQueryPeriodDays from '../../hooks/use-query-period-days.js';
import SortableTable from '../common/SortableTable.jsx';
import { SadEmpty } from '../repo-summary/Empty.jsx';

type CentralTemplateUsageProps = {
  centralTemplateRuns: number;
  mainBranchCentralTemplateBuilds: number;
  totalRuns: number;
  buildDefinitionId: string;
};

const CentralTemplateUsage: React.FC<CentralTemplateUsageProps> = ({
  centralTemplateRuns,
  mainBranchCentralTemplateBuilds,
  totalRuns,
  buildDefinitionId,
}) => {
  const cnp = useCollectionAndProject();
  const domId = `bdi-${buildDefinitionId}`;
  const [hasHovered, setHasHovered] = useState(false);
  const centralTemplateOptions = trpc.builds.centralTemplateOptions.useQuery(
    { ...cnp, buildDefinitionId },
    { enabled: hasHovered }
  );

  if (centralTemplateRuns === 0) {
    return (
      <span
        className="text-sm px-1.5 py-0.5 bg-theme-danger-dim rounded-sm text-theme-danger"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="None of the builds used the central build template"
        data-tooltip-place="bottom"
      >
        No
      </span>
    );
  }
  return (
    <>
      <span
        className={`text-sm px-1.5 py-0.5 rounded-sm font-semibold ${
          centralTemplateRuns >= totalRuns
            ? 'text-theme-success bg-theme-success'
            : 'text-theme-warn bg-theme-warn'
        }`}
        onMouseOver={() => setHasHovered(true)}
        onFocus={() => setHasHovered(true)}
        data-tooltip-id={domId}
      >
        Yes
      </span>
      <Tooltip
        id={domId}
        place="bottom"
        style={{ borderRadius: '0.375rem', zIndex: 10 }}
        opacity={1}
      >
        <div className="w-72 pt-2 text-left whitespace-normal">
          <div className="bg-theme-page-content rounded-3xl mb-2">
            <div
              className="bg-theme-highlight rounded-3xl h-2"
              style={{
                width: divide(centralTemplateRuns, totalRuns)
                  .map(toPercentage)
                  .getOr('0%'),
              }}
            />
          </div>
          <div className="mb-2 leading-snug">
            {centralTemplateRuns >= totalRuns ? (
              <strong>All</strong>
            ) : (
              <>
                <strong>{num(Math.min(centralTemplateRuns, totalRuns))}</strong>
                {' out of the '}
                <strong>{num(totalRuns)}</strong>
              </>
            )}
            {` build ${
              totalRuns === 1 ? 'run' : 'runs'
            } used the central build template.`}
          </div>
          <div className="mb-2">
            {mainBranchCentralTemplateBuilds >= centralTemplateRuns ? (
              <strong>All</strong>
            ) : (
              <strong>
                {num(Math.min(mainBranchCentralTemplateBuilds, centralTemplateRuns))}
              </strong>
            )}
            {` ${centralTemplateRuns === 1 ? 'run' : 'runs'} on the main branch.`}
          </div>
          {centralTemplateOptions.data ? (
            <>
              <strong>Template options:</strong>
              <ul>
                {Object.entries(centralTemplateOptions.data).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-1">
                    <span>{`${key}: `}</span>
                    {typeof value === 'boolean' ? (
                      <span
                        className={`${
                          value ? 'text-theme-success' : 'text-theme-danger'
                        } inline-block`}
                      >
                        {value ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      </span>
                    ) : (
                      <strong>{value}</strong>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Tooltip>
    </>
  );
};

const BuildInsightsWrapper = ({
  item,
}: {
  item: RouterClient['builds']['getBuildsOverviewForRepository'][number];
}) => {
  return (
    <BuildInsights
      buildDefinitionId={item.buildDefinitionId}
      hasRuns={item.totalBuilds !== 0}
    />
  );
};

const Builds: React.FC<{
  repositoryId: string;
}> = ({ repositoryId }) => {
  const [queryPeriodDays] = useQueryPeriodDays();

  const builds = trpc.builds.getBuildsOverviewForRepository.useQuery({
    queryContext: useQueryContext(),
    repositoryId,
  });

  return (
    <TabContents gridCols={1}>
      {builds.data?.length === 0 ? (
        <TabContents gridCols={1}>
          <SadEmpty
            heading="No build pipelines"
            body="There are no build pipelines configured for this repository"
          />
        </TabContents>
      ) : (
        <>
          <SortableTable
            variant="default"
            data={builds.data}
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
                sorter: byNum(x =>
                  divide(x.centralTemplateCount, x.totalBuilds).getOr(0)
                ),
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
                  row.type === 'old' || row.averageDuration === 0
                    ? -100
                    : row.averageDuration
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
                              ? `${shortDate(
                                  new Date(pipeline.latestBuildTime)
                                )}, ${new Date(pipeline.latestBuildTime).getFullYear()}`
                              : 'unknown'
                          }`}
                        </span>
                      </>
                    ) : undefined}
                  </>
                ),
              },
            ]}
            rowKey={row => row.buildDefinitionId.toString()}
            defaultSortColumnIndex={2}
            ChildComponent={BuildInsightsWrapper}
          />
          <div className="w-full text-right text-sm italic text-gray-500 mt-4">
            {`* Data shown is for the last ${queryPeriodDays} days`}
          </div>
        </>
      )}
    </TabContents>
  );
};

export default (repositoryId: string, buildsCount?: number): Tab => {
  return {
    title: 'Builds',
    count: buildsCount ?? 0,
    Component: () => <Builds repositoryId={repositoryId} />,
  };
};
