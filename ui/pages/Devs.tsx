import React from 'react';
import AppliedFilters from '../components/AppliedFilters.js';
import Loading from '../components/Loading.js';
import useQueryParam, { asBoolean } from '../hooks/use-query-param.js';
import Developer2 from '../components/Dev2.jsx';
import { trpc } from '../helpers/trpc.js';
import useDevFilters from '../hooks/use-dev-filters.jsx';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import AlertMessage from '../components/common/AlertMessage.jsx';
import SortControls from '../components/SortControls.jsx';

const FiltersAndSorters: React.FC<{ devsCount: number }> = ({ devsCount }) => {
  return (
    <>
      <AppliedFilters type="devs" count={devsCount} />
      <div className="mb-6 flex flex-row gap-2 items-center">
        <h4 className="text-slate-500">Sort by</h4>
        <SortControls
          sortByList={['Name', 'Repos Committed']}
          defaultSortDirection="asc"
        />
      </div>
    </>
  );
};

const DevsNew: React.FC = () => {
  const [showOldDevListing] = useQueryParam('dev-listing-v1', asBoolean);

  const filters = useDevFilters();
  const query = trpc.commits.getSortedDevListing.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor,
    enabled: !showOldDevListing,
  });

  if (!showOldDevListing && !query.data) return <Loading />;

  return (
    <ul>
      {query?.data?.pages?.flatMap(page => page.items).length ? (
        <>
          <InfiniteScrollList2
            items={query.data.pages.flatMap(page => page.items) || []}
            itemKey={dev => dev.authorEmail}
            itemComponent={Developer2}
            loadNextPage={query.fetchNextPage}
          />
          {query.isFetching ? <Loading /> : null}
        </>
      ) : (
        <AlertMessage message="No Developers found" />
      )}
    </ul>
  );
};

export default () => {
  const filters = useDevFilters();
  const filteredDevs = trpc.commits.getFilteredDevCount.useQuery({
    queryContext: filters.queryContext,
    searchTerm: filters.searchTerm,
  });

  return (
    <>
      <FiltersAndSorters devsCount={filteredDevs?.data || 0} />
      <DevsNew />
    </>
  );
};
