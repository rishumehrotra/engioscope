import React from 'react';
import { byDate, byNum, byString } from 'sort-lib';
import DrawerTabs from './DrawerTabs.jsx';
import { useQueryContext } from '../../hooks/query-hooks.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { DrawerTableProps } from './DrawerTable.jsx';
import DrawerTable from './DrawerTable.jsx';
import { shortDate } from '../../helpers/utils.js';
import useRepoFilters from '../../hooks/use-repo-filters.js';
import { HappyEmpty, SadEmpty } from './Empty.jsx';

type RepoItem = RouterClient['repos']['getRepoListingWithPipelineCount'][number];

type PipelineListProps = {
  item: RepoItem;
  pipelineType?: 'yaml' | 'non-yaml';
};

const PipelinesList: React.FC<PipelineListProps> = ({ item, pipelineType }) => {
  const queryContext = useQueryContext();
  const pipelines = trpc.builds.getPipeLineBuildStatsForRepo.useQuery({
    queryContext,
    repositoryId: item.repositoryId,
    pipelineType,
  });

  return (
    <DrawerTable
      data={pipelines.data}
      rowKey={x => x.definitionId}
      isChild
      columns={[
        {
          title: 'Name',
          key: 'name',
          // eslint-disable-next-line react/no-unstable-nested-components
          value: x => (
            <>
              <a
                className="link-text"
                href={x.definitionUrl
                  .replace('/_apis/build/Definitions/', '/_build?definitionId=')
                  .replace(/\?revision=(.*)/, '')}
                target="_blank"
                rel="noreferrer"
              >
                {x.definitionName}
              </a>
              {pipelineType === undefined && !x.isYaml ? (
                <span
                  className={[
                    'inline-block ml-2 uppercase text-xs px-2 py-1 bg-red-100',
                    'rounded-sm text-red-400 font-semibold no-underline',
                  ].join(' ')}
                >
                  UI
                </span>
              ) : null}
            </>
          ),
          sorter: byString(x => x.definitionName.toLocaleLowerCase()),
        },
        {
          title: 'Runs in the last 90 days',
          key: 'runs',
          value: x => x.buildsCount,
          sorter: byNum(x => x.buildsCount),
        },
        {
          title: 'Last used',
          key: 'last-used-date',
          value: x =>
            x.latestBuildTimestamp
              ? `${shortDate(new Date(x.latestBuildTimestamp))}, ${new Date(
                  x.latestBuildTimestamp
                ).getFullYear()}`
              : '_',
          sorter: byDate(x => x.latestBuildTimestamp || new Date(0)),
        },
      ]}
      defaultSortColumnIndex={1}
    />
  );
};

const reposTableProps = (
  pipelineType?: 'yaml' | 'non-yaml'
): Omit<DrawerTableProps<RepoItem>, 'data'> => {
  const pipelineCount: (x: RepoItem) => number =
    pipelineType === 'yaml'
      ? x => x.yaml
      : pipelineType === 'non-yaml'
      ? x => x.nonYaml
      : x => x.total;

  return {
    rowKey: x => x.repositoryId,
    columns: [
      {
        title: 'Repositories',
        key: 'repos',
        value: x => x.name,
        sorter: byString(x => x.name.toLocaleLowerCase()),
      },
      ...(pipelineType
        ? []
        : [
            {
              title: 'Not using YAML',
              key: 'non-yaml',
              value: (x: RepoItem) => x.nonYaml,
              sorter: byNum((x: RepoItem) => x.nonYaml),
            },
          ]),
      {
        title: 'Pipelines',
        key: 'pipelines',
        value: pipelineCount,
        sorter: byNum(pipelineCount),
      },
    ],
    ChildComponent: ({ item }) => (
      <PipelinesList item={item} pipelineType={pipelineType} />
    ),
    defaultSortColumnIndex: 1,
  };
};

const YAMLPipelinesDrawer: React.FC<{
  totalPipelines: number;
  yamlPipelines: number;
}> = ({ totalPipelines, yamlPipelines }) => {
  const filters = useRepoFilters();
  const repoListingWithPipelineCount =
    trpc.repos.getRepoListingWithPipelineCount.useQuery({
      queryContext: filters.queryContext,
      searchTerms: filters.searchTerms,
      groupsIncluded: filters.groupsIncluded,
      teams: filters.teams,
    });

  return (
    <DrawerTabs
      tabs={[
        {
          title: `Not using YAML (${totalPipelines - yamlPipelines})`,
          key: 'non-yaml',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            const repos = repoListingWithPipelineCount?.data?.filter(
              repoPipelines => repoPipelines.nonYaml > 0
            );

            if (repos?.length === 0) {
              return (
                <HappyEmpty body="Looks like all repositories are using YAML pipelines" />
              );
            }

            return <DrawerTable data={repos} {...reposTableProps('non-yaml')} />;
          },
        },
        {
          title: `Using YAML (${yamlPipelines})`,
          key: 'yaml',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            const repos = repoListingWithPipelineCount?.data?.filter(
              repoPipelines => repoPipelines.yaml > 0
            );

            if (repos?.length === 0) {
              return (
                <SadEmpty
                  heading="No repositories found"
                  body="There are currently no repositories using YAML pipelines"
                />
              );
            }

            return <DrawerTable data={repos} {...reposTableProps('yaml')} />;
          },
        },
        {
          title: `All pipelines (${totalPipelines})`,
          key: 'all',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            return (
              <DrawerTable
                data={repoListingWithPipelineCount?.data}
                {...reposTableProps()}
              />
            );
          },
        },
      ]}
    />
  );
};

export default YAMLPipelinesDrawer;
