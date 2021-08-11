import React from 'react';
import AlertMessage from '../components/common/AlertMessage';
import RepoHealth from '../components/RepoHealth';
import AppliedFilters from '../components/AppliedFilters';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes } from '../types';
import { repoMetrics } from '../network';
import { dontFilter } from '../helpers/utils';
import { RepoAnalysis } from '../../shared/types';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { SortMap, useSort } from '../hooks/sort-hooks';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const qualityGateSortName = (codeQuality: RepoAnalysis['codeQuality']) => {
  if (!codeQuality) return 'd';
  if (codeQuality.qualityGate === 'ok') return 'a';
  if (codeQuality.qualityGate === 'warn') return 'b';
  return 'c';
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

const sorters: SortMap<RepoAnalysis> = {
  'Builds': (a, b) => (a.builds?.count || 0) - (b.builds?.count || 0),
  'Branches': (a, b) => a.branches.total - b.branches.total,
  'Commits': (a, b) => a.commits.count - b.commits.count,
  'Pull requests': (a, b) => a.prs.total - b.prs.total,
  'Tests': (a, b) => (a.tests?.total || 0) - (b.tests?.total || 0),
  'Code quality': (a, b) => qualityGateSortName(a.codeQuality)
    .localeCompare(qualityGateSortName(b.codeQuality))
};

const Repos: React.FC = () => {
  const projectAnalysis = useFetchForProject(repoMetrics);
  const sorter = useSort(sorters, 'Builds');
  const [search] = useUrlParams<string>('search');
  const [commitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtMoreThanDays] = useUrlParams<number>('techDebtGreaterThan');

  if (projectAnalysis === 'loading') return <div>Loading...</div>;

  const repos = projectAnalysis.repos
    .filter(search === undefined ? dontFilter : bySearchTerm(search))
    .filter(!commitsGreaterThanZero ? dontFilter : byCommitsGreaterThanZero)
    .filter(!buildsGreaterThanZero ? dontFilter : byBuildsGreaterThanZero)
    .filter(!withFailingLastBuilds ? dontFilter : byFailingLastBuilds)
    .filter(techDebtMoreThanDays === undefined ? dontFilter : byTechDebtMoreThanDays(techDebtMoreThanDays))
    .sort(sorter);

  return (
    <div>
      <AppliedFilters count={repos.length} />
      {
        repos.length ? repos.map((repo, index) => (
          <RepoHealth repo={repo} key={repo.name} isFirst={index === 0} />
        )) : <AlertMessage message="No repos found" />
      }
    </div>
  );
};

export default Repos;
