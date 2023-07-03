import React from 'react';
import AppliedFilters from '../components/AppliedFilters.jsx';
import InfiniteScrollList2 from '../components/common/InfiniteScrollList2.jsx';
import { MultiSelectDropdownWithLabel } from '../components/common/MultiSelectDropdown.jsx';
import { Pipeline } from '../components/ReleasePipelineHealth.jsx';
import ReleasePipelineSummary from '../components/ReleasePipelineSummary.jsx';
import { trpc } from '../helpers/trpc.js';
import { useCollectionAndProject } from '../hooks/query-hooks.js';
import { useRemoveSort } from '../hooks/sort-hooks.js';
import useQueryParam, { asBoolean, asStringArray } from '../hooks/use-query-param.js';
import useReleaseFilters from '../hooks/use-release-filters.js';
import TeamsSelector from '../components/teams-selector/TeamsSelector.jsx';

const ReleasePipelines: React.FC = () => {
  const [isTeamsEnabled] = useQueryParam('enable-teams', asBoolean);
  const cnp = useCollectionAndProject();
  const projectSummary = trpc.projects.summary.useQuery(cnp);
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam(
    'group',
    asStringArray
  );
  const filters = useReleaseFilters();
  useRemoveSort();
  const query = trpc.releases.paginatedReleases.useInfiniteQuery(filters, {
    getNextPageParam: lastPage => lastPage.nextCursor,
  });
  const count = trpc.releases.filteredReleaseCount.useQuery(filters);

  return (
    <>
      {isTeamsEnabled ? (
        <div className="mb-6 ml-1">
          <TeamsSelector />
        </div>
      ) : projectSummary.data?.groups?.groups.length ? (
        <div className="mb-6">
          <MultiSelectDropdownWithLabel
            label={projectSummary.data.groups.label}
            options={projectSummary.data.groups.groups.map(group => ({
              label: group,
              value: group,
            }))}
            value={selectedGroupLabels || []}
            onChange={x => setSelectedGroupLabels(x.length === 0 ? undefined : x)}
          />
        </div>
      ) : null}
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
