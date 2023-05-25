import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type {
  ProjectWorkItemAnalysis,
  UIWorkItem,
  UIWorkItemRevision,
} from '../../shared/types.js';
import { workItemMetrics, workItemRevisions } from '../network.js';
import { createPalette, dontFilter } from '../helpers/utils.js';
import WorkItem from '../components/WorkItemHealth.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import type { SortMap } from '../hooks/sort-hooks.js';
import { useSort } from '../hooks/sort-hooks.js';
import AppliedFilters from '../components/AppliedFilters.js';
import Loading from '../components/Loading.js';
import InfiniteScrollList from '../components/common/InfiniteScrollList.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import SortControls from '../components/SortControls.jsx';

const colorForStage = createPalette([
  '#2ab7ca',
  '#fed766',
  '#0e9aa7',
  '#3da4ab',
  '#f6cd61',
  '#fe8a71',
  '#96ceb4',
  '#ffeead',
  '#ff6f69',
  '#ffcc5c',
  '#88d8b0',
  '#a8e6cf',
  '#dcedc1',
  '#ffd3b6',
  '#ffaaa5',
  '#ff8b94',
  '#00b159',
  '#00aedb',
  '#f37735',
  '#ffc425',
  '#edc951',
  '#eb6841',
  '#00a0b0',
  '#fe4a49',
]);

const bySearchTerm = (searchTerm: string) => (workItem: UIWorkItem) =>
  `${workItem.id}: ${workItem.title}`.toLowerCase().includes(searchTerm.toLowerCase());

const sorters = (childrenCount: (id: number) => number): SortMap<UIWorkItem> => ({
  'Bundle size': (a, b) => childrenCount(a.id) - childrenCount(b.id),
});

const useRevisionsForCollection = () => {
  const { collection } = useParams<{ collection: string }>();
  const [revisions, setRevisions] = useState<
    Record<string, 'loading' | UIWorkItemRevision[]>
  >({});

  const getRevisions = useCallback(
    (workItemIds: number[]) => {
      const needToFetch = workItemIds.filter(id => !revisions[id]);

      setRevisions(rs =>
        needToFetch.reduce((rs, id) => ({ ...rs, [id]: 'loading' }), rs)
      );

      if (!needToFetch.length) return;

      // TODO: Error handling
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-floating-promises
      workItemRevisions(collection!, [...new Set(needToFetch)]).then(revisions => {
        setRevisions(rs =>
          needToFetch.reduce((rs, id) => ({ ...rs, [id]: revisions[id] }), rs)
        );
      });
    },
    [collection, revisions]
  );

  return [revisions, getRevisions] as const;
};

const WorkItemsInternal: React.FC<{ workItemAnalysis: ProjectWorkItemAnalysis }> = ({
  workItemAnalysis,
}) => {
  const [revisions, getRevisions] = useRevisionsForCollection();
  const [search] = useQueryParam('search', asString);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const workItems = workItemAnalysis.workItems!;

  const sorterMap = useMemo(() => {
    const { workItems } = workItemAnalysis;
    if (workItems === null) return sorters(() => 0);
    return sorters((id: number) => (workItems.ids[id] || []).length);
  }, [workItemAnalysis]);

  const sorter = useSort(sorterMap, 'Bundle size');

  const workItemById = useCallback((id: number) => workItems.byId[id], [workItems.byId]);

  const filteredWorkItems = useMemo(() => {
    const { workItems } = workItemAnalysis;
    if (!workItems) return [];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const topLevelWorkItems = workItems.ids[0]!.map(workItemById);
    return topLevelWorkItems
      .filter(search === undefined ? dontFilter : bySearchTerm(search))
      .sort(sorter);
  }, [search, sorter, workItemAnalysis, workItemById]);

  const workItemType = useCallback(
    (workItem: UIWorkItem) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      workItemAnalysis.workItems!.types[workItem.typeId],
    [workItemAnalysis]
  );

  const setRenderedWorkItems = useCallback(
    (workItems: UIWorkItem[]) => {
      getRevisions(workItems.map(({ id }) => id));
    },
    [getRevisions]
  );

  const showWorkItem = useCallback(
    (workItem: UIWorkItem) => (
      <WorkItem
        workItemId={workItem.id}
        workItemsById={workItems.byId}
        workItemsIdTree={workItems.ids}
        workItemType={workItemType}
        colorForStage={colorForStage}
        revisions={revisions}
        getRevisions={getRevisions}
      />
    ),
    [getRevisions, revisions, workItemType, workItems.byId, workItems.ids]
  );

  return (
    <>
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        <AppliedFilters type="workitems" count={filteredWorkItems.length} />
      </div>
      <div className="mb-6 flex flex-row gap-2 items-center">
        <h4 className="text-slate-500">Sort by</h4>
        <SortControls />
      </div>
      <InfiniteScrollList
        items={filteredWorkItems}
        itemKey={({ id }) => id}
        onRenderItems={setRenderedWorkItems}
        itemRenderer={showWorkItem}
      />
    </>
  );
};

const WorkItems: React.FC = () => {
  const workItemAnalysis = useFetchForProject(workItemMetrics);

  if (workItemAnalysis === 'loading') return <Loading />;
  if (!workItemAnalysis.workItems) return <div>No work items found.</div>;

  return <WorkItemsInternal workItemAnalysis={workItemAnalysis} />;
};
export default WorkItems;
