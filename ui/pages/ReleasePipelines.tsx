import React from 'react';
import AppliedFilters from '../components/AppliedFilters.jsx';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { Pipeline } from '../components/ReleasePipelineHealth.jsx';
import ReleasePipelineSummary from '../components/ReleasePipelineSummary.jsx';
import { trpc } from '../helpers/trpc.js';
import { useRemoveSort } from '../hooks/sort-hooks.js';
import useReleaseFilters from '../hooks/use-release-filters.js';
import TeamsSelector from '../components/teams-selector/TeamsSelector.jsx';

const ReleasePipelines: React.FC = () => {
  const filters = useReleaseFilters();
  useRemoveSort();
  const query = trpc.releases.paginatedReleases.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor,
  });
  const count = trpc.releases.filteredReleaseCount.useQuery(filters);

  return (
    <>
      <div className="mb-6 ml-1">
        <TeamsSelector />
      </div>
      <AppliedFilters type="release-pipelines" count={count.data} />
      <ReleasePipelineSummary />
      <InfiniteScrollList2
        items={query.data?.pages.flatMap(page => page.items) || []}
        itemKey={pipeline => pipeline.id.toString()}
        itemComponent={Pipeline}
        loadNextPage={query.fetchNextPage}
      />
    </>
  );
};

export default ReleasePipelines;
