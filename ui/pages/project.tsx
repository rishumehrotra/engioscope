import React, { useState, useEffect, useCallback } from 'react';
import {
  useParams, useHistory, Switch, Route
} from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import { ProjectRepoAnalysis, RepoAnalysis } from '../../shared/types';
import { fetchProjectMetrics } from '../network';
import NavBar from '../components/NavBar';
import SortButtons from '../components/SortButtons';
import Repos from './repos';
import Releases from './releases';
import { parseQueryString, updateQueryString } from '../helpers';

const ProjectDetails : React.FC<Pick<ProjectRepoAnalysis, 'name' | 'repos' | 'lastUpdated'>> = projectAnalysis => (
  <div className="">
    <h1 className="text-4xl font-semibold text-gray-800">
      {projectAnalysis.name[1]}
      <span className="text-base ml-2 text-gray-600">
        {projectAnalysis.repos.length}
        {'   '}
        repositories
      </span>
    </h1>
    <p className="text-sm text-gray-600 mt-2 flex items-center">
      Last updated on
      <p className="font-bold text-gray-800 ml-1">{projectAnalysis.lastUpdated}</p>
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

const sortByIndicators = (sortBy: string, sort: number) => (a: RepoAnalysis, b: RepoAnalysis) => {
  const branchRatingA = a.indicators.find(indicator => indicator.name === sortBy)?.count;
  const branchRatingB = b.indicators.find(indicator => indicator.name === sortBy)?.count;
  if (branchRatingA && branchRatingB) {
    return (branchRatingA > branchRatingB) ? sort : sort * -1;
  }
  if (branchRatingA) return sort;
  if (branchRatingB) return sort * -1;
  return (a.rating > b.rating ? sort : sort * -1);
};

const bySearchTerm = (searchTerm: string) => (repo: RepoAnalysis) => (
  repo.name.toLowerCase().includes(searchTerm.toLowerCase())
);

const Project: React.FC = () => {
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectRepoAnalysis | undefined>();
  const [sort, setSort] = useState<number>(-1);
  const [sortBy, setSortBy] = useState<string>('Builds');
  const { collection, project } = useParams<{ collection: string, project: string }>();
  const history = useHistory();

  const { search } = parseQueryString(history.location.search);
  const setSearchTerm = (searchTerm: string) => history.replace({ search: updateQueryString({ search: searchTerm }) });

  const onSecondaryMenuSelect = useCallback(
    (selectedKey: string) => {
      history.push(`${history.location.pathname.split('/').slice(0, -1).join('/')}/${selectedKey}`);
    },
    [history]
  );

  useEffect(() => {
    fetchProjectMetrics(collection, project).then(setProjectAnalysis);
  }, [collection, project]);

  if (!projectAnalysis) return <div>Loading...</div>;

  const filteredRepos = projectAnalysis.repos
    .filter(bySearchTerm(search || ''))
    .sort(sortByIndicators(sortBy, sort));

  return (
    <div>
      <div className="grid grid-cols-2 justify-between w-full items-start mt-12 mb-6">
        <ProjectDetails
          name={projectAnalysis.name}
          repos={projectAnalysis.repos}
          lastUpdated={projectAnalysis.lastUpdated}
        />
        <div className="flex justify-end">
          <SearchInput className="w-1/2" onSearch={setSearchTerm} searchTerm={search} />
        </div>
      </div>
      <div className="pb-6">
        <div className="border-t border-gray-200" />
      </div>
      <div className="grid grid-cols-2 mb-8">
        <NavBar onSelect={onSecondaryMenuSelect} navItems={[{ key: 'repos' }, { key: 'releases' }]} />
        <SortButtons
          sort={sort}
          setSort={setSort}
          setSortBy={setSortBy}
          sortBy={sortBy}
          labels={projectAnalysis.repos[0]?.indicators.map(i => i.name)}
        />
      </div>

      <Switch>
        <Route path="/:collection/:project/repos">
          <Repos repos={filteredRepos} />
        </Route>
        <Route path="/:collection/:project/releases">
          <Releases />
        </Route>
      </Switch>
    </div>
  );
};

export default Project;
