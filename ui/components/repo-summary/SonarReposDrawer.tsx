import React, { useMemo } from 'react';
import { byString, byNum } from 'sort-lib';
import { prop } from 'rambda';
import DrawerTabs from './DrawerTabs.jsx';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { SortableTableProps } from '../common/SortableTable.jsx';
import SortableTable from '../common/SortableTable.jsx';
import useRepoFilters from '../../hooks/use-repo-filters.js';
import { HappyEmpty, SadEmpty } from './Empty.jsx';
import {
  capitalizeFirstLetter,
  shouldNeverReachHere,
  weightedQualityGate,
} from '../../../shared/utils.js';
import InlineSelect from '../common/InlineSelect.jsx';
import { combinedQualityGate } from '../../helpers/utils.js';

type NonSonarRepoItem = RouterClient['sonar']['getSonarRepos']['nonSonarRepos'][number];
type SonarRepoItem = RouterClient['sonar']['getSonarRepos']['sonarRepos'][number];
type SonarProjectItems =
  RouterClient['sonar']['getSonarRepos']['sonarRepos'][number]['sonarProjects'];
type SonarProjectListProps = {
  sonarProjects: SonarProjectItems;
};

type ProjectStatus = 'all' | 'pass' | 'fail' | 'other';

const SonarProjectList: React.FC<SonarProjectListProps> = ({ sonarProjects }) => {
  return (
    <SortableTable
      variant="drawer"
      data={sonarProjects}
      rowKey={x => x.id.toString()}
      isChild
      columns={[
        {
          title: 'SonarQube projects',
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
          title: 'Quality gate',
          key: 'quality-gate',
          // eslint-disable-next-line react/no-unstable-nested-components
          value: x =>
            x.status === 'pass' ? (
              <span className="text-theme-success">Pass</span>
            ) : x.status === 'fail' ? (
              <span className="text-theme-danger">Fail</span>
            ) : (
              <span className="text-theme-helptext">Unknown</span>
            ),
          sorter: byString(x => (x.status ? x.status.toLocaleLowerCase() : '')),
        },
      ]}
      defaultSortColumnIndex={1}
    />
  );
};

const nonSonarReposTableProps: Omit<SortableTableProps<NonSonarRepoItem>, 'data'> = {
  variant: 'drawer',
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

const sonarReposTableProps: Omit<
  SortableTableProps<SonarRepoItem & { status: string; sortWeight: number }>,
  'data'
> = {
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
      title: 'Quality gate',
      key: 'quality-gate',
      value: x => {
        if (x.sortWeight > 0) {
          return (
            <div className="inline-block bg-theme-success-dim rounded-sm px-2 py-0.5 text-sm">
              <span className="text-theme-success">
                {capitalizeFirstLetter(x.status)}
              </span>
            </div>
          );
        }

        if (x.sortWeight === 0) {
          return (
            <div className="inline-block bg-theme-danger-dim rounded-sm px-2 py-0.5 text-sm">
              <span className="text-theme-danger">
                {x.sonarProjects.length > 1 ? capitalizeFirstLetter(x.status) : `Fail`}
              </span>
            </div>
          );
        }

        return (
          <div className="inline-block bg-theme-secondary rounded-sm px-2 py-0.5 text-sm">
            <span className="text-theme-helptext">Unknown</span>
          </div>
        );
      },
      sorter: byNum(x =>
        x.sortWeight === 100 && x.sonarProjects.length > 1
          ? x.sortWeight + 100 + x.sonarProjects.length
          : x.sortWeight
      ),
    },
  ],
  ChildComponent: ({ item }) =>
    item.sonarProjects && item.sonarProjects.length > 0 ? (
      <SonarProjectList sonarProjects={item.sonarProjects} />
    ) : null,
  defaultSortColumnIndex: 1,
};

const SonarReposDrawer: React.FC<{ projectsType: ProjectStatus }> = ({
  projectsType,
}) => {
  const filters = useRepoFilters();

  const repos = trpc.sonar.getSonarRepos.useQuery({
    queryContext: filters.queryContext,
    searchTerms: filters.searchTerms,
    teams: filters.teams,
  });

  const hasOthers = useMemo(() => {
    return repos.data?.sonarRepos.some(r =>
      r.sonarProjects.some(p => p.status !== 'pass' && p.status !== 'fail')
    );
  }, [repos.data?.sonarRepos]);

  const [statusType, setStatusType] = React.useState<ProjectStatus>(
    projectsType ?? 'all'
  );

  const emptyMessage = useMemo(() => {
    if (statusType === 'all') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no repositories set up on SonarQube"
          />
        </div>
      );
    }
    if (statusType === 'pass') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no repositories passing SonarQube quality gates"
          />
        </div>
      );
    }
    if (statusType === 'fail') {
      return (
        <div className="my-32">
          <HappyEmpty
            heading="No repositories found"
            body="There are currently no repositories failing SonarQube quality gates"
          />
        </div>
      );
    }
    if (statusType === 'other') {
      // This can't happen as we only show this option if we know its non-empty
      return null;
    }
    return shouldNeverReachHere(statusType);
  }, [statusType]);

  return (
    <DrawerTabs
      selectedTabIndex={projectsType === 'pass' || projectsType === 'fail' ? 1 : 0}
      tabs={[
        {
          title: `Not using SonarQube (${
            (repos.data?.nonSonarRepos?.length || 0) +
            (repos.data?.sonarRepos?.filter(r => r.projectsWithSonarMeasures === 0)
              ?.length || 0)
          })`,
          key: 'non-sonar',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            const repoList = repos.data?.nonSonarRepos.concat(
              repos.data?.sonarRepos.filter(r => r.projectsWithSonarMeasures === 0) ?? []
            );

            if (repoList?.length === 0) {
              return (
                <HappyEmpty body="Looks like all repositories are using SonarQube" />
              );
            }

            return <SortableTable data={repoList} {...nonSonarReposTableProps} />;
          },
        },
        {
          title: `Using SonarQube (${
            repos.data?.sonarRepos.filter(r => r.projectsWithSonarMeasures > 0)?.length ||
            0
          })`,
          key: 'sonar',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            const sonarMeasuresRepos =
              repos.data?.sonarRepos.filter(r => r.projectsWithSonarMeasures > 0) ?? [];

            const repoList =
              statusType === 'all'
                ? sonarMeasuresRepos
                : sonarMeasuresRepos.filter(x => {
                    if (statusType === 'pass') {
                      return x.sonarProjects.some(p => p.status === 'pass');
                    }
                    if (statusType === 'fail') {
                      return x.sonarProjects.some(p => p.status === 'fail');
                    }
                    if (statusType === 'other') {
                      return x.sonarProjects.some(
                        p => !(p.status === 'pass' || p.status === 'fail')
                      );
                    }
                    return shouldNeverReachHere(statusType);
                  });

            return (
              <>
                <div className="mx-4">
                  <label htmlFor="status" className="text-sm">
                    Show
                  </label>
                  <InlineSelect
                    id="status"
                    value={statusType}
                    className="py-2 ml-3"
                    options={[
                      { label: 'All SonarQube projects', value: 'all' },
                      { label: 'Pass', value: 'pass' },
                      { label: 'Fail', value: 'fail' },
                      ...(hasOthers ? [{ label: 'Others', value: 'other' }] : []),
                    ]}
                    onChange={e => setStatusType(e as ProjectStatus)}
                  />
                </div>
                {repoList?.length === 0 ? (
                  emptyMessage
                ) : (
                  <SortableTable
                    data={repoList?.map(r => ({
                      ...r,
                      status: combinedQualityGate(r.sonarProjects.map(prop('status'))),
                      sonarProjects: r.sonarProjects.filter(p => {
                        if (statusType === 'all') return true;
                        if (statusType === 'pass') return p.status === 'pass';
                        if (statusType === 'fail') return p.status === 'fail';
                        if (statusType === 'other') {
                          return p.status !== 'pass' && p.status !== 'fail';
                        }
                        return shouldNeverReachHere(statusType);
                      }),
                      sortWeight: weightedQualityGate(r.sonarProjects.map(p => p.status)),
                    }))}
                    {...sonarReposTableProps}
                  />
                )}
              </>
            );
          },
        },
      ]}
    />
  );
};
export default SonarReposDrawer;
