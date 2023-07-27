import React, { Suspense, lazy } from 'react';
import { prop } from 'rambda';
import AppliedFilters from '../components/AppliedFilters.js';
import Loading from '../components/Loading.js';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { trpc } from '../helpers/trpc.js';
import useRepoFilters from '../hooks/use-repo-filters.js';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import StreamingRepoSummary from '../components/repo-summary/RepoSummary.jsx';
import SortControls from '../components/SortControls.jsx';
import TeamsSelector from '../components/teams-selector/TeamsSelector.jsx';
import noSearchResults from '../images/no-search-results.svg';

const RepoHealth = lazy(() => import('../components/RepoHealth.jsx'));

const RepoListing: React.FC = () => {
  const filters = useRepoFilters();
  const query = trpc.repos.getFilteredAndSortedReposWithStats.useInfiniteQuery(filters, {
    getNextPageParam: prop('nextCursor'),
  });

  return (
    <Suspense fallback={<Loading />}>
      <InfiniteScrollList2
        items={query.data?.pages.flatMap(prop('items')) || []}
        itemKey={repo => repo.repoDetails.id}
        itemComponent={RepoHealth}
        loadNextPage={query.fetchNextPage}
      />
    </Suspense>
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
      <div className="grid grid-flow-row mb-4">
        <TeamsSelector />
        <QueryPeriodSelector />
      </div>
      <AppliedFilters type="repos" count={filteredReposCount?.data} />
      {filteredReposCount.data !== undefined && filteredReposCount.data === 0 ? (
        <div className="text-center">
          <img src={noSearchResults} alt="No search results" className="inline-block" />
          <h3 className="font-medium">No repositories found</h3>
          <p className="max-w-xs m-auto text-sm text-theme-helptext">
            Sorry, there are no repositiries matching your filter. Try removing one of
            your filters.
          </p>
        </div>
      ) : (
        <>
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
      )}
    </>
  );
};
