import React, { useState, useEffect, useCallback } from 'react';
import {
  useParams, useHistory, Switch, Route
} from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import {
  ProjectReleaseAnalysis, ProjectRepoAnalysis, RepoAnalysis
} from '../../shared/types';
import { fetchProjectMetrics, fetchProjectReleaseMetrics } from '../network';
import NavBar from '../components/NavBar';
import SortButtons from '../components/SortButtons';
import Repos from './Repos';
import Releases from './Releases';
import { parseQueryString, updateQueryString } from '../helpers';

const renderIfAvailable = (count: number | undefined) => (label: string) => (count ? `${count} ${label}` : '');

const ProjectDetails : React.FC<Pick<ProjectRepoAnalysis, 'name' | 'lastUpdated'> &
{repoCount: number; releasesCount?: number}> = ({
  name, repoCount, lastUpdated, releasesCount
}) => (
  <div className="col-span-2">
    <h1 className="text-4xl font-semibold text-gray-800">
      {name[1]}
      <span className="text-base ml-2 text-gray-600">
        {renderIfAvailable(repoCount)('repositories')}
        {repoCount && releasesCount ? ' | ' : ''}
        {renderIfAvailable(releasesCount)('pipelines')}
      </span>
    </h1>
    <p className="text-sm text-gray-600 mt-2 flex items-center">
      Last updated on
      <span className="font-bold text-gray-800 ml-1">{lastUpdated}</span>
      {' '}
      {/* <button
        type="button"
        className="ml-5 bg-white py-2 px-3 border hover:border-gray-300
        rounded-md hover:shadow-sm text-sm leading-4 font-medium text-indigo-500
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex"
      >
        <Refresh />
        <p className="ml-1">Refresh now</p>
      </button> */}
    </p>
  </div>
);

const qualityGateSortName = (codeQuality: RepoAnalysis['codeQuality']) => {
  if (!codeQuality) return 'd';
  if (codeQuality.qualityGate === 'ok') return 'a';
  if (codeQuality.qualityGate === 'warn') return 'b';
  return 'c';
};

const sortByIndicators = (sortBy: string, sort: number) => (a: RepoAnalysis, b: RepoAnalysis) => {
  if (sortBy === 'Builds') {
    return sort * ((a.builds?.count || 0) - (b.builds?.count || 0));
  }
  if (sortBy === 'Branches') {
    return sort * (a.branches.total - b.branches.total);
  }
  if (sortBy === 'Pull requests') {
    return sort * (a.prs.total - b.prs.total);
  }
  if (sortBy === 'Tests') {
    return sort * ((a.tests?.total || 0) - (b.tests?.total || 0));
  }

  // sortBy === 'Code quality'
  return sort * -1 * qualityGateSortName(a.codeQuality).localeCompare(qualityGateSortName(b.codeQuality));
};

const bySearchTerm = (searchTerm: string) => (repo: RepoAnalysis) => (
  repo.name.toLowerCase().includes(searchTerm.toLowerCase())
);

const Project: React.FC = () => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectRepoAnalysis | undefined>();
  const [releaseAnalysis, setReleaseAnalysis] = useState<ProjectReleaseAnalysis | undefined>();
  const [sort, setSort] = useState<number>(-1);
  const [sortBy, setSortBy] = useState<string>('Builds');
  const history = useHistory();

  const { search } = parseQueryString(history.location.search);
  const setSearchTerm = (searchTerm: string) => history.replace({ search: updateQueryString({ search: searchTerm }) });

  const pathParts = history.location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1];

  const onSecondaryMenuSelect = useCallback(
    (selectedKey: string) => {
      history.push(`${pathParts.slice(0, -1).join('/')}/${selectedKey}`);
    },
    [history, pathParts]
  );

  useEffect(() => {
    fetchProjectMetrics(collection, project).then(setProjectAnalysis);
  }, [collection, project]);

  useEffect(() => {
    fetchProjectReleaseMetrics(collection, project).then(setReleaseAnalysis);
  }, [collection, project]);

  if (!projectAnalysis) return <div>Loading...</div>;

  const filteredRepos = projectAnalysis.repos
    .filter(bySearchTerm(search || ''))
    .sort(sortByIndicators(sortBy, sort));

  return (
    <div>
      <div className="grid grid-cols-3 justify-between w-full items-start mt-12 mb-6">
        <ProjectDetails
          name={projectAnalysis.name}
          repoCount={projectAnalysis.repos.length}
          releasesCount={releaseAnalysis?.releases?.length || undefined}
          lastUpdated={projectAnalysis.lastUpdated}
        />
        <div className="flex justify-end">
          <SearchInput className="w-full" onSearch={setSearchTerm} search={search} />
        </div>
      </div>
      <div className="pb-6">
        <div className="border-t border-gray-200" />
      </div>
      <div className="grid grid-cols-2 mb-8">
        <NavBar
          onSelect={onSecondaryMenuSelect}
          navItems={[{ key: 'repos' }, { key: 'releases' }]}
          selectedTab={selectedTab}
        />
        { selectedTab === 'repos' ? (
          <SortButtons
            sort={sort}
            setSort={setSort}
            setSortBy={setSortBy}
            sortBy={sortBy}
            labels={[
              'Builds',
              'Branches',
              'Pull requests',
              'Tests',
              'Code quality'
            ]}
          />
        ) : null}
      </div>

      <Switch>
        <Route path="/:collection/:project/repos">
          <Repos repos={filteredRepos} />
        </Route>
        <Route path="/:collection/:project/releases">
          <Releases releaseAnalysis={releaseAnalysis} search={search} />
        </Route>
      </Switch>
    </div>
  );
};

export default Project;
