import React, { Suspense, lazy } from 'react';
import AlertMessage from '../components/common/AlertMessage.js';
import AppliedFilters from '../components/AppliedFilters.js';
import Loading from '../components/Loading.js';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { trpc } from '../helpers/trpc.js';
import useRepoFilters from '../hooks/use-repo-filters.js';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import StreamingRepoSummary from '../components/repo-summary/RepoSummary.jsx';
import SortControls from '../components/SortControls.jsx';
import TeamsSelector from '../components/teams-selector/TeamsSelector.jsx';

const RepoHealth = lazy(() => import('../components/RepoHealth.jsx'));

const RepoListing: React.FC = () => {
  const filters = useRepoFilters();
  const query = trpc.repos.getFilteredAndSortedReposWithStats.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor,
  });

  if (!query.data) return <Loading />;

  return query.data.pages.flatMap(page => page.items).length ? (
    <Suspense fallback={<Loading />}>
      <InfiniteScrollList2
        items={query.data.pages.flatMap(page => page.items) || []}
        itemKey={repo => repo.repoDetails.id}
        itemComponent={RepoHealth}
        loadNextPage={query.fetchNextPage}
      />
    </Suspense>
  ) : (
    <AlertMessage message="No repos found" />
  );
};
export default () => {
  const filters = useRepoFilters();

  const filteredReposCount = trpc.repos.getFilteredReposCount.useQuery({
    queryContext: filters.queryContext,
    searchTerms: filters.searchTerms,
    teams: filters.teams,
  });

  return (
    <>
      <div className="flex items-end mb-6 justify-between mx-1">
        <TeamsSelector />
        <QueryPeriodSelector />
      </div>
      <AppliedFilters type="repos" count={filteredReposCount?.data || 0} />
      <StreamingRepoSummary />
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
