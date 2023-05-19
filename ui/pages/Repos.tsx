import React, { useMemo } from 'react';
import AlertMessage from '../components/common/AlertMessage.js';
import AppliedFilters from '../components/AppliedFilters.js';
import { repoMetrics } from '../network.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import Loading from '../components/Loading.js';
import { aggregateDevs } from '../helpers/aggregate-devs.js';
import RepoSummary from '../components/RepoSummary.js';
import { MultiSelectDropdownWithLabel } from '../components/common/MultiSelectDropdown.js';
import useQueryParam, { asStringArray } from '../hooks/use-query-param.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { trpc } from '../helpers/trpc.js';
import useRepoFilters from '../hooks/use-repo-filters.jsx';
import RepoHealth2 from '../components/RepoHealth2.jsx';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import { combinedQualityGateStatus } from '../components/code-quality-utils.js';
import type { RepoAnalysis } from '../../shared/types.js';
import type { SortMap } from '../hooks/sort-hooks.js';
import { useSort } from '../hooks/sort-hooks.js';
import { numberOfBuilds, numberOfTests } from '../../shared/repo-utils.js';

const qualityGateNumber = (codeQuality: RepoAnalysis['codeQuality']) => {
  if (!codeQuality) return 1000;
  const status = combinedQualityGateStatus(codeQuality);
  if (status === 'pass') return 3;
  if (status === 'warn') return 2;
  return 1;
};

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sorter = useSort(sorters, 'Builds');
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam(
    'group',
    asStringArray
  );

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

  if (projectAnalysis === 'loading' || aggregatedDevs === 'loading') return <Loading />;

  if (!query.data) return <Loading />;

  return query.data.pages.flatMap(page => page.items).length ? (
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
      <AppliedFilters type="repos" count={filteredReposCount?.data || 0} />
      <RepoSummary queryPeriodDays={queryPeriodDays} />
      <InfiniteScrollList2
        items={query.data.pages.flatMap(page => page.items) || []}
        itemKey={repo => repo.repoDetails.id}
        itemComponent={RepoHealth2}
        loadNextPage={query.fetchNextPage}
      />
      {query.isFetching ? <Loading /> : null}
    </>
  ) : (
    <AlertMessage message="No repos found" />
  );
};

export default Repos;
