import React, { useCallback, useState } from 'react';
import { useQueryParam } from 'use-query-params';
import ReactTooltip from 'react-tooltip';
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

const TOP = 20;
const BOTTOM = 10;

const top = (page: number, repos: RepoAnalysis[]) => {
  const maxNumberOfPages = repos.length - (TOP * page) - BOTTOM;
  if (page >= maxNumberOfPages) return repos;
  return [...repos.slice(0, page * TOP)];
};

const sorters: SortMap<RepoAnalysis> = {
  'Builds': (a, b) => (a.builds?.count || 0) - (b.builds?.count || 0),
  'Branches': (a, b) => a.branches.total - b.branches.total,
  'Commits': (a, b) => a.commits.count - b.commits.count,
  'Pull requests': (a, b) => a.prs.total - b.prs.total,
  'Tests': (a, b) => (a.tests?.total || 0) - (b.tests?.total || 0),
  'Code quality': (a, b) => qualityGateNumber(b.codeQuality) - qualityGateNumber(a.codeQuality)
};

const LoadMore: React.FC<{hiddenReposCount: number; loadMore: () => void}> = ({ hiddenReposCount, loadMore }) => (
  <div className="flex justify-between items-center my-16">
    <div className="zigzag mx-4" />
    <div className="border rounded-sm p-4">
      <div className="text-sm">{`${hiddenReposCount} repos hidden`}</div>
      <button
        onClick={loadMore}
        className="w-32 text-base link-text"
      >
        Show more...
      </button>
    </div>
    <div className="zigzag mx-4" />
  </div>
);

const Repos: React.FC = () => {
  const projectAnalysis = useFetchForProject(repoMetrics);
  const sorter = useSort(sorters, 'Builds');
  const [search] = useQueryParam<string>('search');
  const [commitsGreaterThanZero] = useQueryParam<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero] = useQueryParam<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds] = useQueryParam<boolean>('withFailingLastBuilds');
  const [techDebtMoreThanDays] = useQueryParam<number>('techDebtGreaterThan');
  const [page, setPage] = useState<number>(1);
  const loadMore = useCallback(() => setPage(Number(page || 1) + 1), [page]);
  if (projectAnalysis === 'loading') return <Loading />;

  const repos = projectAnalysis.repos
    .filter(search === undefined ? dontFilter : bySearch(search))
    .filter(!commitsGreaterThanZero ? dontFilter : byCommitsGreaterThanZero)
    .filter(!buildsGreaterThanZero ? dontFilter : byBuildsGreaterThanZero)
    .filter(!withFailingLastBuilds ? dontFilter : byFailingLastBuilds)
    .filter(techDebtMoreThanDays === undefined ? dontFilter : byTechDebtMoreThanDays(techDebtMoreThanDays))
    .sort(sorter);

  const topRepos = top(page || 1, repos);
  const bottomRepos = [...repos.slice(repos.length - BOTTOM)];

  return (
    <div>
      <ReactTooltip />
      <AppliedFilters type="repos" count={topRepos.length} />
      { repos.length ? (
        <>
          {
            topRepos.length ? topRepos.map((repo, index) => <RepoHealth repo={repo} key={repo.name} isFirst={index === 0} />) : null
          }
          {(repos.length >= topRepos.length + bottomRepos.length) ? (
            <LoadMore
              loadMore={loadMore}
              hiddenReposCount={repos.length - topRepos.length - bottomRepos.length}
            />
          ) : null}
          {
            bottomRepos.length ? bottomRepos.map(repo => <RepoHealth repo={repo} key={repo.name} />) : null
          }
        </>
      ) : <AlertMessage message="No repos found" />}
    </div>
  );
};

export default Repos;

