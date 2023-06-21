import React from 'react';
import { byString, byNum } from 'sort-lib';
import DrawerTabs from './DrawerTabs.jsx';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { DrawerTableProps } from './DrawerTable.jsx';
import DrawerTable from './DrawerTable.jsx';
import useRepoFilters from '../../hooks/use-repo-filters.jsx';
import { HappyEmpty, SadEmpty } from './Empty.jsx';

type NonSonarRepoItem = RouterClient['sonar']['getSonarRepos']['nonSonarRepos'][number];
type SonarRepoItem = RouterClient['sonar']['getSonarRepos']['sonarRepos'][number];
type SonarProjectItems =
  RouterClient['sonar']['getSonarRepos']['sonarRepos'][number]['sonarProjects'];
type SonarProjectListProps = {
  sonarProjects: SonarProjectItems;
};

const SonarProjectList: React.FC<SonarProjectListProps> = ({ sonarProjects }) => {
  return (
    <DrawerTable
      data={sonarProjects}
      rowKey={x => x.id.toString()}
      isChild
      columns={[
        {
          title: 'Sonar Projects',
          key: 'sonar-projects',

          // eslint-disable-next-line react/no-unstable-nested-components
          value: x =>
            x.url === null ? (
              x.name
            ) : (
              <a className="link-text" href={x.url} target="_blank" rel="noreferrer">
                {x.name}
              </a>
            ),
          sorter: byString(x => x.name.toLocaleLowerCase()),
        },
        {
          title: 'Code Quality',
          key: 'code-quality',
          // eslint-disable-next-line react/no-unstable-nested-components
          value: x =>
            x.status === 'pass' ? (
              <span className="text-green-500">Pass</span>
            ) : x.status === 'fail' ? (
              <span className="text-red-500">Fail</span>
            ) : x.status === null ? (
              <span className="text-gray-500">Unknown</span>
            ) : (
              <span className="text-green-500">Pass</span>
            ),
          sorter: byString(x => (x.status ? x.status.toLocaleLowerCase() : '')),
        },
      ]}
      defaultSortColumnIndex={1}
    />
  );
};

const nonSonarReposTableProps = (): Omit<DrawerTableProps<NonSonarRepoItem>, 'data'> => {
  return {
    rowKey: x => x.repositoryId,
    columns: [
      {
        title: 'Repositories',
        key: 'repos',
        value: x => x.repositoryName,
        sorter: byString(x => x.repositoryName.toLocaleLowerCase()),
      },
    ],
  };
};

const sonarReposTableProps = (): Omit<DrawerTableProps<SonarRepoItem>, 'data'> => {
  return {
    rowKey: x => x.repositoryId,
    columns: [
      {
        title: 'Repositories',
        key: 'repos',
        value: x => x.repositoryName,
        sorter: byString(x => x.repositoryName.toLocaleLowerCase()),
      },
      {
        title: 'Code Quality',
        key: 'code-quality',
        value: x =>
          x.status === 'pass' ? (
            <div className="inline-block bg-green-300 rounded-sm px-2 py-1 text-sm">
              <span className="text-green-600">Pass</span>
            </div>
          ) : x.status === 'fail' ? (
            <div className="inline-block bg-red-300 rounded-sm px-2 py-1 text-sm">
              <span className="text-red-600">Fail</span>
            </div>
          ) : x.status === null ? (
            <div className="inline-block bg-gray-300 rounded-sm px-2 py-1 text-sm">
              <span className="text-gray-600">Unknown</span>
            </div>
          ) : (
            <div className="inline-block bg-green-300 rounded-sm px-2 py-1 text-sm">
              <span className="text-green-600">{x.status}</span>
            </div>
          ),
        // sorter: byString(x => (x.status ? x.status.toLocaleLowerCase() : '')),
        sorter: byNum(x => x.statusWeight ?? -1),
      },
    ],
    ChildComponent: ({ item }) =>
      item.sonarProjects && item.sonarProjects.length > 0 ? (
        <SonarProjectList sonarProjects={item.sonarProjects} />
      ) : null,
    defaultSortColumnIndex: 1,
  };
};

const SonarReposDrawer: React.FC = () => {
  const filters = useRepoFilters();

  const repos = trpc.sonar.getSonarRepos.useQuery({
    queryContext: filters.queryContext,
    searchTerms: filters.searchTerms,
    groupsIncluded: filters.groupsIncluded,
  });
  return (
    <DrawerTabs
      tabs={[
        {
          title: `Not Using Sonar (${repos.data?.nonSonarRepos?.length || 0})`,
          key: 'non-sonar',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            const repoList = repos.data?.nonSonarRepos;

            if (!repoList || repoList?.length === 0) {
              return (
                <HappyEmpty body="Looks like all repositories are using SonarQube" />
              );
            }

            return <DrawerTable data={repoList} {...nonSonarReposTableProps()} />;
          },
        },
        {
          title: `Using Sonar (${repos.data?.sonarRepos?.length || 0})`,
          key: 'sonar',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            const repoList = repos.data?.sonarRepos;

            if (!repoList || repoList?.length === 0) {
              return (
                <SadEmpty
                  heading="No repositories found"
                  body="There are currently no repositories with SonarQube"
                />
              );
            }

            return <DrawerTable data={repoList} {...sonarReposTableProps()} />;
          },
        },
      ]}
    />
  );
};
export default SonarReposDrawer;
