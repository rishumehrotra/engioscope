import React, { useCallback, useMemo } from 'react';
import AlertMessage from '../components/common/AlertMessage.js';
import RepoHealth from '../components/RepoHealth.js';
import AppliedFilters from '../components/AppliedFilters.js';
import { repoMetrics } from '../network.js';
import { dontFilter, filterBySearch } from '../helpers/utils.js';
import type { RepoAnalysis } from '../../shared/types.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import type { SortMap } from '../hooks/sort-hooks.js';
import { useSort } from '../hooks/sort-hooks.js';
import Loading from '../components/Loading.js';
import { aggregateDevs } from '../helpers/aggregate-devs.js';
import RepoSummary from '../components/RepoSummary.js';
import InfiniteScrollList from '../components/common/InfiniteScrollList.js';
import { combinedQualityGateStatus } from '../components/code-quality-utils.js';
import { MultiSelectDropdownWithLabel } from '../components/common/MultiSelectDropdown.js';
import { numberOfBuilds, numberOfTests } from '../../shared/repo-utils.js';
import useQueryParam, {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
} from '../hooks/use-query-param.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';

import { trpc } from '../helpers/trpc.js';
import useRepoFilters from '../hooks/use-repo-filters.jsx';
import RepoHealth2 from '../components/RepoHealth2.jsx';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';

const qualityGateNumber = (codeQuality: RepoAnalysis['codeQuality']) => {
  if (!codeQuality) return 1000;
  const status = combinedQualityGateStatus(codeQuality);
  if (status === 'pass') return 3;
  if (status === 'warn') return 2;
  return 1;
};

const bySearch = (search: string) => (repo: RepoAnalysis) =>
  filterBySearch(search, repo.name);
const byCommitsGreaterThanZero = (repo: RepoAnalysis) => repo.commits.count;
const byBuildsGreaterThanZero = (repo: RepoAnalysis) => numberOfBuilds(repo) > 0;
const byFailingLastBuilds = (repo: RepoAnalysis) =>
  repo.builds?.pipelines.some(pipeline => pipeline.status.type !== 'succeeded');
const byTechDebtMoreThanDays = (techDebtMoreThanDays: number) => (repo: RepoAnalysis) =>
  repo.codeQuality?.some(
    q => (q.maintainability.techDebt || 0) / (24 * 60) > techDebtMoreThanDays
  );
const bySelectedGroups =
  (groupNames: string[], groups: Record<string, string[]>) => (repo: RepoAnalysis) =>
    groupNames.some(groupName => (groups[groupName] || []).includes(repo.name));

const sorters: SortMap<RepoAnalysis> = {
  'Builds': (a, b) => numberOfBuilds(a) - numberOfBuilds(b),
  'Branches': (a, b) => a.branches.total - b.branches.total,
  'Commits': (a, b) => a.commits.count - b.commits.count,
  'Pull requests': (a, b) => a.prs.total - b.prs.total,
  'Tests': (a, b) => numberOfTests(a) - numberOfTests(b),
  'Code quality': (a, b) =>
    qualityGateNumber(b.codeQuality) - qualityGateNumber(a.codeQuality),
};

const Repos: React.FC = () => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const projectAnalysis = useFetchForProject(repoMetrics);
  const sorter = useSort(sorters, 'Builds');
  const [search] = useQueryParam('search', asString);
  const [commitsGreaterThanZero] = useQueryParam('commitsGreaterThanZero', asBoolean);
  const [buildsGreaterThanZero] = useQueryParam('buildsGreaterThanZero', asBoolean);
  const [withFailingLastBuilds] = useQueryParam('withFailingLastBuilds', asBoolean);
  const [techDebtMoreThanDays] = useQueryParam('techDebtGreaterThan', asNumber);
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam(
    'group',
    asStringArray
  );
  const [showOldListing] = useQueryParam('listing-v1', asBoolean);

  const filters = useRepoFilters();
  const query = trpc.repos.getFilteredAndSortedReposWithStats.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor,
  });

  const filteredReposCount = trpc.repos.getFilteredReposCount.useQuery({
    queryContext: filters.queryContext,
    searchTerm: filters.searchTerm,
    groupsIncluded: filters.groupsIncluded,
  });

  const aggregatedDevs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis);
  }, [projectAnalysis]);

  const repos = useMemo(() => {
    if (projectAnalysis === 'loading') return [];

    return projectAnalysis.repos
      .filter(search === undefined ? dontFilter : bySearch(search))
      .filter(commitsGreaterThanZero ? byCommitsGreaterThanZero : dontFilter)
      .filter(buildsGreaterThanZero ? byBuildsGreaterThanZero : dontFilter)
      .filter(withFailingLastBuilds ? byFailingLastBuilds : dontFilter)
      .filter(
        techDebtMoreThanDays === undefined
          ? dontFilter
          : byTechDebtMoreThanDays(techDebtMoreThanDays)
      )
      .filter(
        !selectedGroupLabels ||
          selectedGroupLabels?.length === 0 ||
          !projectAnalysis.groups?.groups
          ? dontFilter
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            bySelectedGroups(selectedGroupLabels, projectAnalysis.groups!.groups)
      )
      .sort(sorter);
  }, [
    buildsGreaterThanZero,
    commitsGreaterThanZero,
    projectAnalysis,
    search,
    selectedGroupLabels,
    sorter,
    techDebtMoreThanDays,
    withFailingLastBuilds,
  ]);

  const showRepo = useCallback(
    (repo: RepoAnalysis, index: number) => {
      if (aggregatedDevs === 'loading' || projectAnalysis === 'loading') return null;

      return (
        <RepoHealth
          repo={repo}
          aggregatedDevs={aggregatedDevs}
          isFirst={index === 0}
          queryPeriodDays={queryPeriodDays}
        />
      );
    },
    [aggregatedDevs, projectAnalysis, queryPeriodDays]
  );

  if (projectAnalysis === 'loading' || aggregatedDevs === 'loading') return <Loading />;

  if (showOldListing) {
    return repos.length ? (
      <>
        <div className="flex items-end mb-6 justify-between mx-1">
          {projectAnalysis.groups?.groups ? (
            <MultiSelectDropdownWithLabel
              label={projectAnalysis.groups.label}
              options={Object.keys(projectAnalysis.groups.groups).map(groupName => ({
                value: groupName,
                label: groupName,
              }))}
              value={selectedGroupLabels || []}
              onChange={x => {
                setSelectedGroupLabels(x.length === 0 ? undefined : x);
              }}
            />
          ) : (
            <div />
          )}
          <QueryPeriodSelector />
        </div>
        <AppliedFilters
          type="repos"
          count={showOldListing ? repos.length : filteredReposCount?.data || 0}
        />
        <RepoSummary repos={repos} queryPeriodDays={queryPeriodDays} />

        <InfiniteScrollList
          items={repos}
          itemKey={repo => repo.id}
          itemRenderer={showRepo}
        />
      </>
    ) : (
      <AlertMessage message="No repos found" />
    );
  }

  if (query.isFetching) return <Loading />;
  return query.data?.pages.flatMap(page => page.items).length ? (
    <>
      <div className="flex items-end mb-6 justify-between mx-1">
        {projectAnalysis.groups?.groups ? (
          <MultiSelectDropdownWithLabel
            label={projectAnalysis.groups.label}
            options={Object.keys(projectAnalysis.groups.groups).map(groupName => ({
              value: groupName,
              label: groupName,
            }))}
            value={selectedGroupLabels || []}
            onChange={x => {
              setSelectedGroupLabels(x.length === 0 ? undefined : x);
            }}
          />
        ) : (
          <div />
        )}
        <QueryPeriodSelector />
      </div>
      <AppliedFilters
        type="repos"
        count={showOldListing ? repos.length : filteredReposCount?.data || 0}
      />
      <RepoSummary repos={repos} queryPeriodDays={queryPeriodDays} />
      <InfiniteScrollList2
        items={query.data?.pages.flatMap(page => page.items) || []}
        itemKey={repo => repo.repoDetails.id}
        itemComponent={RepoHealth2}
        loadNextPage={query.fetchNextPage}
      />
    </>
  ) : (
    <AlertMessage message="No repos found" />
  );
};

export default Repos;
