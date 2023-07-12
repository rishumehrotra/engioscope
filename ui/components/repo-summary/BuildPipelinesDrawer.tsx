import React, { useMemo } from 'react';
import { byString, byNum } from 'sort-lib';

import { multiply } from 'rambda';
import { GitPullRequest } from 'react-feather';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { SortableTableProps } from '../common/SortableTable.jsx';
import SortableTable from '../common/SortableTable.jsx';
import useRepoFilters from '../../hooks/use-repo-filters.js';
import { HappyEmpty, SadEmpty } from './Empty.jsx';
import { divide, shouldNeverReachHere, toPercentage } from '../../../shared/utils.js';
import InlineSelect from '../common/InlineSelect.jsx';
import { relativeTime, shortDate } from '../../helpers/utils.js';
import CentralTemplateUsage from '../CentralTemplateUsage.jsx';

type BuildRepoItem = RouterClient['builds']['getBuildsDrawerListing'][number];

type BuildPipelineItem =
  RouterClient['builds']['getBuildsDrawerListing'][number]['pipelines'][number];

type BuildPipelineListProps = {
  pipelines: BuildPipelineItem[];
};

type PipelineTypes =
  | 'all'
  | 'currentlySucceeding'
  | 'currentlyFailing'
  | 'noBuildsInThreeMonths'
  | 'usingCentralTemplate'
  | 'notUsingCentralTemplate';

const BuildPipelines: React.FC<BuildPipelineListProps> = ({ pipelines }) => {
  return (
    <SortableTable
      variant="drawer"
      data={pipelines}
      rowKey={x => x.def.id.toString()}
      isChild
      columns={[
        {
          title: 'Name',
          key: 'definitionName',

          // eslint-disable-next-line react/no-unstable-nested-components
          value: x => {
            if (!x.def.url) {
              <div>{x.def.name}</div>;
            }

            return (
              <div>
                <div>
                  <a
                    className="link-text"
                    href={x.def.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {x.def.name}
                  </a>

                  {x.def.process.processType === 1 && (
                    <span className="inline-block ml-2 uppercase text-xs px-1.5 py-0.5 bg-theme-danger-dim rounded-sm text-theme-danger font-semibold">
                      UI
                    </span>
                  )}

                  {x.hasBuilds ? (
                    <span>
                      <GitPullRequest
                        size={20}
                        className="inline-block ml-2 -mt-1 text-theme-icon"
                      />
                    </span>
                  ) : null}
                </div>
                <div>
                  {x.hasBuilds && x.builds.lastBuildStatus === 'succeeded' && (
                    <>
                      <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2">
                        {' '}
                      </span>
                      <span className="capitalize">{x.builds.lastBuildStatus}</span>{' '}
                      <span
                        data-tooltip-id="react-tooltip"
                        data-tooltip-content={`${shortDate(
                          new Date(x.builds.lastBuildTimestamp)
                        )}, ${new Date(x.builds.lastBuildTimestamp).getFullYear()}`}
                      >
                        {relativeTime(new Date(x.builds.lastBuildTimestamp))}
                      </span>
                    </>
                  )}
                  {x.hasBuilds &&
                  (x.builds.lastBuildStatus === 'failed' ||
                    x.builds.lastBuildStatus === 'canceled' ||
                    x.builds.lastBuildStatus === 'partiallySucceeded') ? (
                    <>
                      <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2">
                        {' '}
                      </span>
                      <span>
                        {`Failing since ${shortDate(
                          new Date(x.builds.failingSince.timestamp)
                        )}`}
                      </span>
                    </>
                  ) : undefined}
                  {x.hasBuilds ? undefined : (
                    <>
                      <span className="bg-gray-500 w-2 h-2 rounded-full inline-block mr-2">
                        {' '}
                      </span>
                      <span>
                        {`Last used ${
                          x.def.latestBuild?.finishTime
                            ? `${shortDate(
                                new Date(x.def.latestBuild.finishTime)
                              )}, ${new Date(x.def.latestBuild.finishTime).getFullYear()}`
                            : 'unknown'
                        }`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          },
          sorter: byString(x => x.def.name.toLocaleLowerCase()),
        },
        {
          title: 'Central Template',
          key: 'centralTemplate',

          // eslint-disable-next-line react/no-unstable-nested-components
          value: x => (
            <CentralTemplateUsage
              buildDefinitionId={String(x.def.id)}
              centralTemplateRuns={
                x.hasAzureBuildReports ? x.azureBuildReports.templateUsers : 0
              }
              mainBranchCentralTemplateBuilds={
                x.hasAzureBuildReports
                  ? x.azureBuildReports.mainBranchCentralTemplateBuilds
                  : 0
              }
              totalRuns={x.hasBuilds ? x.builds.totalBuilds : 0}
            />
          ),
          sorter: byNum(x =>
            x.hasAzureBuildReports && x.azureBuildReports.templateUsers > 0 ? 1 : 0
          ),
        },
        {
          title: 'Runs',
          key: 'buildRuns',

          value: x => (x.hasBuilds ? x.builds.totalBuilds : '-'),
          sorter: byNum(x => (x.hasBuilds ? x.builds.totalBuilds : 0)),
        },
        {
          title: 'Success rate',
          key: 'coverage',
          value: x => {
            if (!x.hasBuilds) {
              return '-';
            }

            if (x.builds.totalBuilds === 0 || x.builds.totalSuccessfulBuilds === 0) {
              return '-';
            }

            return divide(x.builds.totalSuccessfulBuilds || 0, x.builds.totalBuilds || 0)
              .map(toPercentage)
              .getOr('_');
          },

          sorter: byNum(x => {
            if (!x.hasBuilds) {
              return 0;
            }

            if (x.builds.totalBuilds === 0 || x.builds.totalSuccessfulBuilds === 0) {
              return 0;
            }

            return divide(x.builds.totalSuccessfulBuilds, x.builds.totalBuilds)
              .map(multiply(100))
              .getOr(0);
          }),
        },
      ]}
      defaultSortColumnIndex={2}
    />
  );
};

const buildRepoItemProps: Omit<SortableTableProps<BuildRepoItem>, 'data'> = {
  variant: 'drawer',
  rowKey: x => x.repositoryId,
  columns: [
    {
      title: 'Repositories',
      key: 'repos',
      value: x => x.repositoryName,
      sorter: byString(x => x.repositoryName.toLocaleLowerCase()),
    },
    {
      title: 'Builds',
      key: 'builds',
      value: x => x.builds,
      sorter: byNum(x => x.builds),
    },
  ],
  ChildComponent: ({ item }) =>
    item.pipelines?.length > 0 ? <BuildPipelines pipelines={item.pipelines} /> : null,
  defaultSortColumnIndex: 1,
};

const BuildPipelinesDrawer: React.FC<{ pipelineType: PipelineTypes }> = ({
  pipelineType: pipelinesTypeProp,
}) => {
  const filters = useRepoFilters();

  const repos = trpc.builds.getBuildsDrawerListing.useQuery({
    queryContext: filters.queryContext,
    searchTerms: filters.searchTerms,
    teams: filters.teams,
  });

  const [statusType, setStatusType] = React.useState<PipelineTypes>(
    pipelinesTypeProp ?? 'all'
  );

  const emptyMessage = useMemo(() => {
    if (statusType === 'all') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no repositories having tests and reporting coverage"
          />
        </div>
      );
    }
    if (statusType === 'notUsingCentralTemplate') {
      return (
        <div className="my-32">
          <HappyEmpty
            heading="No repositories found"
            body="All pipelines are using the central template"
          />
        </div>
      );
    }
    if (statusType === 'currentlySucceeding') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no pipelines with a currently succeeding build"
          />
        </div>
      );
    }
    if (statusType === 'currentlyFailing') {
      return (
        <div className="my-32">
          <HappyEmpty
            heading="No repositories found"
            body="There are currently no pipelines with a currently failing build"
          />
        </div>
      );
    }
    if (statusType === 'noBuildsInThreeMonths') {
      return (
        <div className="my-32">
          <HappyEmpty
            heading="No repositories found"
            body="All pipelines have had a build in the last three months"
          />
        </div>
      );
    }
    if (statusType === 'usingCentralTemplate') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no pipelines using the central template"
          />
        </div>
      );
    }
    return shouldNeverReachHere(statusType);
  }, [statusType]);
  const repoList = repos.data;

  if (repoList?.length === 0) {
    return emptyMessage;
  }

  const filteredRepoList = repoList?.filter(repo => {
    if (statusType === 'all') {
      return true;
    }
    if (statusType === 'currentlySucceeding') {
      return repo.pipelines.some(p =>
        p.hasBuilds ? p.builds?.lastBuildStatus === 'succeeded' : false
      );
    }

    if (statusType === 'currentlyFailing') {
      return repo.pipelines.some(p =>
        p.hasBuilds ? p.builds?.lastBuildStatus !== 'succeeded' : false
      );
    }

    if (statusType === 'noBuildsInThreeMonths') {
      return repo.pipelines.some(p => !p.hasBuilds);
    }

    if (statusType === 'usingCentralTemplate') {
      return repo.pipelines.some(p =>
        p.hasAzureBuildReports ? p.azureBuildReports.templateUsers > 0 : false
      );
    }

    if (statusType === 'notUsingCentralTemplate') {
      return repo.pipelines.some(
        p =>
          !p.hasAzureBuildReports ||
          (p.hasAzureBuildReports && p.azureBuildReports.templateUsers === 0)
      );
    }

    return shouldNeverReachHere(statusType);
  });

  const filteredPipelinesRepoList = filteredRepoList?.map(repo => {
    if (statusType === 'all') {
      return repo;
    }
    if (statusType === 'currentlySucceeding') {
      return {
        ...repo,
        pipelines:
          repo.pipelines?.filter(p =>
            p.hasBuilds ? p.builds?.lastBuildStatus === 'succeeded' : false
          ) ?? [],
      };
    }

    if (statusType === 'currentlyFailing') {
      return {
        ...repo,
        pipelines:
          repo.pipelines?.filter(p =>
            p.hasBuilds ? p.builds?.lastBuildStatus !== 'succeeded' : false
          ) ?? [],
      };
    }

    if (statusType === 'noBuildsInThreeMonths') {
      return {
        ...repo,
        pipelines: repo.pipelines?.filter(p => !p.hasBuilds) ?? [],
      };
    }
    if (statusType === 'usingCentralTemplate') {
      return {
        ...repo,
        pipelines:
          repo.pipelines?.filter(
            p => p.hasAzureBuildReports && p.azureBuildReports.templateUsers > 0
          ) ?? [],
      };
    }
    if (statusType === 'notUsingCentralTemplate') {
      return {
        ...repo,
        pipelines:
          repo.pipelines?.filter(
            p =>
              !p.hasAzureBuildReports ||
              (p.hasAzureBuildReports && p.azureBuildReports.templateUsers === 0)
          ) ?? [],
      };
    }
    return shouldNeverReachHere(statusType);
  });

  return (
    <>
      <InlineSelect
        id="status"
        value={statusType}
        options={[
          { label: 'All pipelines', value: 'all' },
          { label: 'Currently succeeding', value: 'currentlySucceeding' },
          { label: 'Currently failing', value: 'currentlyFailing' },
          { label: 'Not used in last 3 months', value: 'noBuildsInThreeMonths' },
          { label: 'Using the central template', value: 'usingCentralTemplate' },
          { label: 'Not using the central template', value: 'notUsingCentralTemplate' },
        ]}
        onChange={e => setStatusType(e as PipelineTypes)}
      />
      <SortableTable data={filteredPipelinesRepoList} {...buildRepoItemProps} />
    </>
  );
};
export default BuildPipelinesDrawer;
