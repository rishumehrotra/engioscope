import React, { useMemo } from 'react';
import AlertMessage from '../components/common/AlertMessage.js';
import AppliedFilters from '../components/AppliedFilters.js';
import { repoMetrics } from '../network.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import Loading from '../components/Loading.js';
import { aggregateDevs } from '../helpers/aggregate-devs.js';
import { MultiSelectDropdownWithLabel } from '../components/common/MultiSelectDropdown.js';
import useQueryParam, { asBoolean, asStringArray } from '../hooks/use-query-param.js';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { trpc } from '../helpers/trpc.js';
import useRepoFilters from '../hooks/use-repo-filters.js';
import RepoHealth from '../components/RepoHealth.jsx';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import StreamingRepoSummary from '../components/repo-summary/RepoSummary.jsx';
import SortControls from '../components/SortControls.jsx';
import TeamsSelector from '../components/teams-selector/TeamsSelector.jsx';

const SummaryAndRepoGroups: React.FC = () => {
  const [isTeamsEnabled] = useQueryParam('enable-teams', asBoolean);
  const projectAnalysis = useFetchForProject(repoMetrics);
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam(
    'group',
    asStringArray
  );

  const filters = useRepoFilters();

  const filteredReposCount = trpc.repos.getFilteredReposCount.useQuery({
    queryContext: filters.queryContext,
    searchTerms: filters.searchTerms,
    groupsIncluded: filters.groupsIncluded,
    teams: filters.teams,
  });

  const aggregatedDevs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis);
  }, [projectAnalysis]);

  if (projectAnalysis === 'loading' || aggregatedDevs === 'loading') return null;

  return (
    <>
      <div className="flex items-end mb-6 justify-between mx-1">
        {isTeamsEnabled ? (
          <TeamsSelector />
        ) : projectAnalysis.groups?.groups ? (
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
        ) : null}
        <QueryPeriodSelector />
      </div>
      <AppliedFilters type="repos" count={filteredReposCount?.data || 0} />
      <StreamingRepoSummary />
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
        itemComponent={RepoHealth}
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
      <RepoListing />
    </>
  );
};
