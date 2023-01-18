import React from 'react';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { pipeline2 } from '../components/ReleasePipelineHealth.jsx';
import ReleasePipelineSummary2 from '../components/ReleasePipelineSummary2.jsx';
import { trpc } from '../helpers/trpc.js';
import { useRemoveSort } from '../hooks/sort-hooks.js';
import useReleaseFilters from '../hooks/use-release-filters.js';

const ReleasePipelines2: React.FC = () => {
  const filters = useReleaseFilters();
  useRemoveSort();
  const query = trpc.releases.paginatedReleases.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor
  });

  const Component = pipeline2();

  return (
    <>
      {/* {releaseAnalysis.groups
        ? (
          <div className="mb-6">
            <MultiSelectDropdownWithLabel
              label={releaseAnalysis.groups.label}
              options={
                Object.keys(releaseAnalysis.groups.groups)
                  .map(group => ({ label: group, value: group }))
              }
              value={selectedGroupLabels || []}
              onChange={x => setSelectedGroupLabels(x.length === 0 ? undefined : x)}
            />
          </div>
        )
        : null} */}
      {/* <AppliedFilters type="release-pipelines" count={pipelines.length} /> */}
      <ReleasePipelineSummary2 />
      <InfiniteScrollList2
        items={query.data?.pages.flatMap(page => page.items) || []}
        itemKey={pipeline => pipeline.id.toString()}
        itemRenderer={Component}
        loadNextPage={query.fetchNextPage}
      />
    </>
  );
};

export default ReleasePipelines2;
