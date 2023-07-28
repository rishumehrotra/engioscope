import React from 'react';
import Loading from '../components/Loading.js';
import Developer from '../components/Dev.jsx';
import { trpc } from '../helpers/trpc.js';
import useDevFilters from '../hooks/use-dev-filters.js';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import AlertMessage from '../components/common/AlertMessage.jsx';
import SortControls from '../components/SortControls.jsx';
import { minPluralise, num } from '../helpers/utils.js';
import PageTopBlock from '../components/PageTopBlock.jsx';

const FiltersAndSorters: React.FC<{ devsCount?: number }> = ({ devsCount }) => {
  return (
    <>
      <PageTopBlock>
        {devsCount !== 0 && (
          <>
            Showing <strong>{devsCount === undefined ? '...' : num(devsCount)}</strong>{' '}
            {minPluralise(devsCount || 0, 'developer', 'developers')}
          </>
        )}
      </PageTopBlock>
      <SortControls sortByList={['Name', 'Repos Committed']} defaultSortDirection="asc" />
    </>
  );
};

const Devs: React.FC = () => {
  const filters = useDevFilters();
  const query = trpc.commits.getSortedDevListing.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor,
  });

  if (!query.data) return <Loading />;

  return (
    <ul>
      {query?.data?.pages?.flatMap(page => page.items).length ? (
        <>
          <InfiniteScrollList2
            items={query.data.pages.flatMap(page => page.items) || []}
            itemKey={dev => dev.authorEmail}
            itemComponent={Developer}
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
      <FiltersAndSorters devsCount={filteredDevs?.data} />
      <Devs />
    </>
  );
};
