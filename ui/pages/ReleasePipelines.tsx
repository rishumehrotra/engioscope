import React from 'react';
import { prop } from 'rambda';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import ReleasePipelineSummary from '../components/ReleasePipelineSummary.jsx';
import { trpc } from '../helpers/trpc.js';
import { useRemoveSort } from '../hooks/sort-hooks.js';
import useReleaseFilters from '../hooks/use-release-filters.js';
import ReleasePipelineHealth from '../components/ReleasePipelineHealth.jsx';
import { minPluralise, num } from '../helpers/utils.js';
import PageTopBlock from '../components/PageTopBlock.jsx';

const ReleasePipelines: React.FC = () => {
  const filters = useReleaseFilters();
  useRemoveSort();
  const query = trpc.releases.paginatedReleases.useInfiniteQuery(filters, {
    getNextPageParam: prop('nextCursor'),
    keepPreviousData: true,
  });
  const count = trpc.releases.filteredReleaseCount.useQuery(filters);

  return (
    <>
      <PageTopBlock>
        <>
          Showing <strong>{count?.data === undefined ? '...' : num(count.data)}</strong>{' '}
          {minPluralise(count.data || 0, 'release pipeline', 'release pipelines')}
        </>
      </PageTopBlock>
      <ReleasePipelineSummary />
      <InfiniteScrollList2
        items={query.data?.pages.flatMap(page => page.items) || []}
        itemKey={pipeline => pipeline.id.toString()}
        itemComponent={ReleasePipelineHealth}
        loadNextPage={query.fetchNextPage}
      />
    </>
  );
};

export default ReleasePipelines;
