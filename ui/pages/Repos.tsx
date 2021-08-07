import React from 'react';
import AlertMessage from '../components/AlertMessage';
import RepoHealth from '../components/RepoHealth';
import AppliedFilters from '../components/AppliedFilters';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes } from '../types';
import { fetchProjectRepoMetrics } from '../network';
import { dontFilter } from '../helpers/utils';
import useListing, { UseListingHookArg } from '../hooks/use-listing';
import { ProjectRepoAnalysis, RepoAnalysis } from '../../shared/types';

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

const reposListing: UseListingHookArg<ProjectRepoAnalysis, RepoAnalysis> = {
  fetcher: fetchProjectRepoMetrics,
  list: analysis => analysis.repos,
  sort: {
    by: {
      'Builds': (a, b) => (a.builds?.count || 0) - (b.builds?.count || 0),
      'Branches': (a, b) => a.branches.total - b.branches.total,
      'Commits': (a, b) => a.commits.count - b.commits.count,
      'Pull requests': (a, b) => a.prs.total - b.prs.total,
      'Tests': (a, b) => (a.tests?.total || 0) - (b.tests?.total || 0),
      'Code quality': (a, b) => qualityGateSortName(a.codeQuality)
        .localeCompare(qualityGateSortName(b.codeQuality))
    },
    default: 'Builds'
  }
};

const Repos: React.FC = () => {
  const projectAnalysis = useListing(reposListing);
  const [search] = useUrlParams<string>('search');
  const [commitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtMoreThanDays] = useUrlParams<number>('techDebtGreaterThan');

  if (projectAnalysis === 'loading') return <div>Loading...</div>;

  const repos = projectAnalysis.list
    .filter(search === undefined ? dontFilter : bySearchTerm(search))
    .filter(!commitsGreaterThanZero ? dontFilter : byCommitsGreaterThanZero)
    .filter(!buildsGreaterThanZero ? dontFilter : byBuildsGreaterThanZero)
    .filter(!withFailingLastBuilds ? dontFilter : byFailingLastBuilds)
    .filter(techDebtMoreThanDays === undefined ? dontFilter : byTechDebtMoreThanDays(techDebtMoreThanDays));

  return (
    <div>
      <AppliedFilters count={repos.length} />
      {
        repos.length ? repos.map(repo => (
          <RepoHealth repo={repo} key={repo.name} />
        )) : <AlertMessage message="No repos found" />
      }
    </div>
  );
};

export default Repos;
