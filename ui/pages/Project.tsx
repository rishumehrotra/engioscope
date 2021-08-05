import React, { useState, useEffect, useCallback } from 'react';
import {
  useParams, useHistory, Switch, Route
} from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import {
  ProjectReleasePipelineAnalysis, ProjectRepoAnalysis, RepoAnalysis
} from '../../shared/types';
import { fetchProjectMetrics, fetchProjectReleaseMetrics } from '../network';
import NavBar from '../components/NavBar';
import SortButtons from '../components/SortButtons';
import Repos from './Repos';
import ReleasePipelines from './ReleasePipelines';
import AdvancedFilters from '../components/AdvancedFilters';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes, Tab } from '../types';
import WorkItems from './WorkItems';
import { dontFilter } from '../helpers';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);
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
  if (sortBy === 'Commits') {
    return sort * (a.commits.count - b.commits.count);
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
const byCommitsGreaterThanZero = (repo: RepoAnalysis) => repo.commits.count;
const byBuildsGreaterThanZero = (repo: RepoAnalysis) => (repo.builds?.count || 0) > 0;
const byFailingLastBuilds = (repo: RepoAnalysis) => (
  repo.builds?.pipelines.some(pipeline => pipeline.status.type !== 'succeeded')
);

const byTechDebtMoreThanDays = (techDebtMoreThanDays: number) => (repo: RepoAnalysis) => (
  (repo.codeQuality?.techDebt || 0) / (24 * 60) > techDebtMoreThanDays
);

const Project: React.FC = () => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectRepoAnalysis | undefined>();
  const [releaseAnalysis, setReleaseAnalysis] = useState<ProjectReleasePipelineAnalysis | undefined>();
  const [sort, setSort] = useState<number>(-1);
  const [sortBy, setSortBy] = useState<string>('Builds');
  const history = useHistory();

  const [search, setSearchTerm] = useUrlParams<string>('search');
  const [commitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtMoreThanDays] = useUrlParams<number>('techDebtGreaterThan');

  const pathParts = history.location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;

  const onSecondaryMenuSelect = useCallback(
    (selectedKey: string) => {
      history.push(`${pathParts.slice(0, -1).join('/')}/${selectedKey}`);
    },
    [history, pathParts]
  );

  useEffect(() => {
    fetchProjectMetrics(collection, project).then(setProjectAnalysis);
    fetchProjectReleaseMetrics(collection, project).then(setReleaseAnalysis);
  }, [collection, project]);

  if (!projectAnalysis) return <div>Loading...</div>;

  const filteredRepos = projectAnalysis.repos
    .filter(search === undefined ? dontFilter : bySearchTerm(search))
    .filter(!commitsGreaterThanZero ? dontFilter : byCommitsGreaterThanZero)
    .filter(!buildsGreaterThanZero ? dontFilter : byBuildsGreaterThanZero)
    .filter(!withFailingLastBuilds ? dontFilter : byFailingLastBuilds)
    .filter(techDebtMoreThanDays === undefined ? dontFilter : byTechDebtMoreThanDays(techDebtMoreThanDays))
    .sort(sortByIndicators(sortBy, sort));

  return (
    <div>
      <div className="grid grid-cols-3 justify-between w-full items-start my-12">
        <ProjectDetails
          name={projectAnalysis.name}
          repoCount={projectAnalysis.repos.length}
          releasesCount={releaseAnalysis?.pipelines?.length || undefined}
          lastUpdated={projectAnalysis.lastUpdated}
        />
        <div className="flex justify-end">
          <SearchInput className="w-full" onSearch={setSearchTerm} search={search as string} />
          <AdvancedFilters type={selectedTab} />
        </div>
      </div>
      <div className="pb-6">
        <div className="border-t border-gray-200" />
      </div>
      <div className="grid grid-cols-2 mb-8">
        <NavBar
          onSelect={onSecondaryMenuSelect}
          navItems={[{ key: 'repos', name: 'Repos' }, { key: 'release-pipelines', name: 'Release pipelines' }]}
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
              'Commits',
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
        <Route path="/:collection/:project/release-pipelines">
          <ReleasePipelines releaseAnalysis={releaseAnalysis} />
        </Route>
        <Route path="/:collection/:project/workitems">
          <WorkItems collection={collection} project={project} />
        </Route>
      </Switch>
    </div>
  );
};

export default Project;
