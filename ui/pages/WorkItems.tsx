import React, {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react';
import { useQueryParam } from 'use-query-params';
import { useParams } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import type { UIWorkItem, UIWorkItemRevision } from '../../shared/types';
import { workItemMetrics, workItemRevisions } from '../network';
import { dontFilter } from '../helpers/utils';
import WorkItem from '../components/WorkItemHealth';
import useFetchForProject from '../hooks/use-fetch-for-project';
import type { SortMap } from '../hooks/sort-hooks';
import { useSort } from '../hooks/sort-hooks';
import AppliedFilters from '../components/AppliedFilters';
import Loading from '../components/Loading';
import usePagination, { bottomItems, topItems } from '../hooks/pagination';
import LoadMore from '../components/LoadMore';
import FeaturesAndBugsSummary from '../components/FeaturesAndBugsSummary';

const colorPalette = [
  '#2ab7ca', '#fed766', '#0e9aa7', '#3da4ab',
  '#f6cd61', '#fe8a71', '#96ceb4', '#ffeead',
  '#ff6f69', '#ffcc5c', '#88d8b0', '#a8e6cf',
  '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94',
  '#00b159', '#00aedb', '#f37735', '#ffc425',
  '#edc951', '#eb6841', '#00a0b0', '#fe4a49'
];

const bySearchTerm = (searchTerm: string) => (workItem: UIWorkItem) => (
  (`${workItem.id}: ${workItem.title}`).toLowerCase().includes(searchTerm.toLowerCase())
);

const sorters = (childrenCount: (id: number) => number): SortMap<UIWorkItem> => ({
  'Bundle size': (a, b) => childrenCount(a.id) - childrenCount(b.id)
});

const useRevisionsForCollection = () => {
  const { collection } = useParams<{ collection: string }>();
  const [revisions, setRevisions] = useState<Record<string, 'loading' | UIWorkItemRevision[]>>({});

  const getRevisions = useCallback((workItemIds: number[]) => {
    const needToFetch = workItemIds.filter(id => !revisions[id]);

    setRevisions(rs => needToFetch.reduce((rs, id) => ({ ...rs, [id]: 'loading' }), rs));

    if (!needToFetch.length) return;

    workItemRevisions(collection, [...new Set(needToFetch)]).then(revisions => {
      setRevisions(rs => needToFetch.reduce((rs, id) => ({ ...rs, [id]: revisions[id] }), rs));
    });
  }, [collection, revisions]);

  useEffect(() => { setTimeout(ReactTooltip.rebuild, 0); }, [revisions]);

  return [revisions, getRevisions] as const;
};

const WorkItems: React.FC = () => {
  const workItemAnalysis = useFetchForProject(workItemMetrics);
  const [revisions, getRevisions] = useRevisionsForCollection();
  const [search] = useQueryParam<string>('search');
  const colorsForStages = useRef<Record<string, string>>({});
  const [page, loadMore] = usePagination();

  const sorterMap = useMemo(() => {
    if (workItemAnalysis === 'loading') return sorters(() => 0);
    const { workItems } = workItemAnalysis;
    if (workItems === null) return sorters(() => 0);
    return sorters((id: number) => (workItems.ids[id] || []).length);
  }, [workItemAnalysis]);

  const sorter = useSort(sorterMap, 'Bundle size');

  const colorForStage = useCallback((stageName: string) => {
    if (colorsForStages.current[stageName]) return colorsForStages.current[stageName];
    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colorsForStages.current = { ...colorsForStages.current, [stageName]: randomColor };
    return randomColor;
  }, [colorsForStages]);

  const filteredWorkItems = useMemo(() => {
    if (workItemAnalysis === 'loading') return [];
    const { workItems } = workItemAnalysis;
    if (!workItems) return [];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const topLevelWorkItems = workItems.ids[0]!.map(id => workItems.byId[id]);
    return topLevelWorkItems
      .filter(search === undefined ? dontFilter : bySearchTerm(search))
      .sort(sorter);
  }, [search, sorter, workItemAnalysis]);

  const [topWorkItems, bottomWorkItems] = useMemo(() => (
    [topItems(page, filteredWorkItems), bottomItems(filteredWorkItems)]
  ), [filteredWorkItems, page]);

  useEffect(() => {
    const ids = [...topItems(page, filteredWorkItems).map(({ id }) => id), ...bottomItems(filteredWorkItems).map(({ id }) => id)];
    getRevisions(ids);
  }, [filteredWorkItems, getRevisions, page, workItemAnalysis]);

  useEffect(() => { ReactTooltip.rebuild(); }, [filteredWorkItems, revisions]);

  if (workItemAnalysis === 'loading') return <Loading />;
  if (!workItemAnalysis.workItems) return <div>No work items found.</div>;

  const { workItems } = workItemAnalysis;

  return (
    <>
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        <AppliedFilters type="workitems" count={filteredWorkItems.length} />
        <FeaturesAndBugsSummary
          workItems={filteredWorkItems}
          bugLeakage={workItemAnalysis.workItems.bugLeakage}
        />
      </div>

      <ul>
        {topWorkItems.map(workItem => (
          <WorkItem
            key={workItem.id}
            workItemId={workItem.id}
            workItemsById={workItems.byId}
            workItemsIdTree={workItems.ids}
            colorForStage={colorForStage}
            revisions={revisions}
            getRevisions={getRevisions}
          />
        ))}
        <LoadMore
          loadMore={loadMore}
          hiddenItemsCount={filteredWorkItems.length - topWorkItems.length - bottomWorkItems.length}
        />
        {bottomWorkItems.map(workItem => (
          <WorkItem
            key={workItem.id}
            workItemId={workItem.id}
            workItemsById={workItems.byId}
            workItemsIdTree={workItems.ids}
            colorForStage={colorForStage}
            revisions={revisions}
            getRevisions={getRevisions}
          />
        ))}
      </ul>
    </>
  );
};

export default WorkItems;
