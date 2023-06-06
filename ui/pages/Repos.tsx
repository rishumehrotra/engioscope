import React, { useMemo } from 'react';
import AlertMessage from '../components/common/AlertMessage.js';
import AppliedFilters from '../components/AppliedFilters.js';
import { repoMetrics } from '../network.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import Loading from '../components/Loading.js';
import { aggregateDevs } from '../helpers/aggregate-devs.js';
import RepoSummary from '../components/RepoSummary.js';
import { MultiSelectDropdownWithLabel } from '../components/common/MultiSelectDropdown.js';
import useQueryParam, { asString, asStringArray } from '../hooks/use-query-param.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { trpc } from '../helpers/trpc.js';
import useRepoFilters from '../hooks/use-repo-filters.jsx';
import RepoHealth2 from '../components/RepoHealth2.jsx';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import StreamingRepoSummary from '../components/repo-summary/RepoSummary.jsx';
import SortControls from '../components/SortControls.jsx';

const SummaryAndRepoGroups: React.FC = () => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const projectAnalysis = useFetchForProject(repoMetrics);
  const [summaryV2] = useQueryParam('summary-v2', asString);
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam(
    'group',
    asStringArray
  );

  const filters = useRepoFilters();

  const filteredReposCount = trpc.repos.getFilteredReposCount.useQuery({
    queryContext: filters.queryContext,
    searchTerm: filters.searchTerm,
    groupsIncluded: filters.groupsIncluded,
  });

  const aggregatedDevs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis);
  }, [projectAnalysis]);

  if (projectAnalysis === 'loading' || aggregatedDevs === 'loading') return null;

  return (
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
      {summaryV2 ? <StreamingRepoSummary queryPeriodDays={queryPeriodDays} /> : null}
      <RepoSummary queryPeriodDays={queryPeriodDays} />
    </>
  );
};

const RepoListing: React.FC = () => {
  const projectAnalysis = useFetchForProject(repoMetrics);
  const filters = useRepoFilters();
  const query = trpc.repos.getFilteredAndSortedReposWithStats.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor,
  });

  const aggregatedDevs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis);
  }, [projectAnalysis]);

  if (projectAnalysis === 'loading' || aggregatedDevs === 'loading') return <Loading />;

  if (!query.data) return <Loading />;

  return query.data.pages.flatMap(page => page.items).length ? (
    <>
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
export default () => {
  return (
    <>
      <SummaryAndRepoGroups />
      <div className="mb-6 flex flex-row gap-2 items-center w-full">
        <h4 className="text-slate-500">Sort by</h4>
        <SortControls
          sortByList={[
            'Builds',
            'Branches',
            'Commits',
            'Pull requests',
            'Tests',
            'Code quality',
          ]}
        />
      </div>
      <RepoListing />
    </>
  );
};
