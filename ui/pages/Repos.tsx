import React, { useMemo } from 'react';
import { useQueryParam } from 'use-query-params';
import AlertMessage from '../components/common/AlertMessage';
import RepoHealth from '../components/RepoHealth';
import AppliedFilters from '../components/AppliedFilters';
import { repoMetrics } from '../network';
import { dontFilter, filterBySearch } from '../helpers/utils';
import type { RepoAnalysis } from '../../shared/types';
import useFetchForProject from '../hooks/use-fetch-for-project';
import type { SortMap } from '../hooks/sort-hooks';
import { useSort } from '../hooks/sort-hooks';
import Loading from '../components/Loading';
import { aggregateDevs } from '../helpers/aggregate-devs';
import usePagination, { bottomItems, topItems } from '../hooks/pagination';
import LoadMore from '../components/LoadMore';
import RepoSummary from '../components/RepoSummary';

const qualityGateNumber = (codeQuality: RepoAnalysis['codeQuality']) => {
  if (!codeQuality) return 1000;
  if (codeQuality.qualityGate.toLowerCase() === 'ok') return 3;
  if (codeQuality.qualityGate.toLowerCase() === 'warn') return 2;
  return 1;
};

const bySearch = (search: string) => (repo: RepoAnalysis) => filterBySearch(search, repo.name);
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
  'Code quality': (a, b) => qualityGateNumber(b.codeQuality) - qualityGateNumber(a.codeQuality)
};

const Repos: React.FC = () => {
  const projectAnalysis = useFetchForProject(repoMetrics);
  const sorter = useSort(sorters, 'Builds');
  const [search] = useQueryParam<string>('search');
  const [commitsGreaterThanZero] = useQueryParam<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero] = useQueryParam<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds] = useQueryParam<boolean>('withFailingLastBuilds');
  const [techDebtMoreThanDays] = useQueryParam<number>('techDebtGreaterThan');
  const [page, loadMore] = usePagination();

  const aggregatedDevs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis);
  }, [projectAnalysis]);

  const repos = useMemo(() => {
    if (projectAnalysis === 'loading') return [];

    return projectAnalysis.repos
      .filter(search === undefined ? dontFilter : bySearch(search))
      .filter(!commitsGreaterThanZero ? dontFilter : byCommitsGreaterThanZero)
      .filter(!buildsGreaterThanZero ? dontFilter : byBuildsGreaterThanZero)
      .filter(!withFailingLastBuilds ? dontFilter : byFailingLastBuilds)
      .filter(techDebtMoreThanDays === undefined ? dontFilter : byTechDebtMoreThanDays(techDebtMoreThanDays))
      .sort(sorter);
  }, [buildsGreaterThanZero, commitsGreaterThanZero, projectAnalysis, search, sorter, techDebtMoreThanDays, withFailingLastBuilds]);

  const topRepos = useMemo(() => topItems(page, repos), [page, repos]);
  const bottomRepos = useMemo(() => bottomItems(repos), [repos]);

  if (projectAnalysis === 'loading' || aggregatedDevs === 'loading') return <Loading />;

  return (
    <div>
      <AppliedFilters type="repos" count={repos.length} />
      { repos.length ? (
        <>
          <RepoSummary repos={repos} />
          {topRepos.length
            ? topRepos.map((repo, index) => (
              <RepoHealth
                repo={repo}
                key={repo.name}
                aggregatedDevs={aggregatedDevs}
                isFirst={index === 0}
              />
            ))
            : null}
          <LoadMore
            loadMore={loadMore}
            hiddenItemsCount={repos.length - topRepos.length - bottomRepos.length}
          />
          {bottomRepos.length
            ? bottomRepos.map(repo => (
              <RepoHealth
                repo={repo}
                key={repo.name}
                aggregatedDevs={aggregatedDevs}
              />
            ))
            : null}
        </>
      ) : <AlertMessage message="No repos found" />}
    </div>
  );
};

export default Repos;

