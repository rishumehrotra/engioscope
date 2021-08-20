import React, {
  useCallback, useMemo, useRef, useState
} from 'react';
import { useQueryParam } from 'use-query-params';
import { useParams } from 'react-router-dom';
import type { UIWorkItem, UIWorkItemRevision } from '../../shared/types';
import { workItemMetrics, workItemRevisions } from '../network';
import { dontFilter } from '../helpers/utils';
import WorkItem from '../components/WorkItemHealth';
import useFetchForProject from '../hooks/use-fetch-for-project';
import type { SortMap } from '../hooks/sort-hooks';
import { useSort } from '../hooks/sort-hooks';
import AppliedFilters from '../components/AppliedFilters';

const colorPalette = [
  '#2ab7ca', '#fed766', '#0e9aa7', '#3da4ab',
  '#f6cd61', '#fe8a71', '#96ceb4', '#ffeead',
  '#ff6f69', '#ffcc5c', '#88d8b0', '#a8e6cf',
  '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94',
  '#00b159', '#00aedb', '#f37735', '#ffc425',
  '#edc951', '#eb6841', '#00a0b0', '#fe4a49'
];

const bySearchTerm = (searchTerm: string) => (workItem: UIWorkItem) => (
  workItem.title.toLowerCase().includes(searchTerm.toLowerCase())
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

    if (needToFetch.length) {
      workItemRevisions(collection, [...new Set(needToFetch)]).then(revisions => (
        setRevisions(rs => needToFetch.reduce((rs, id) => ({ ...rs, [id]: revisions[id] }), rs))
      ));
    }
  }, [collection, revisions]);

  return [revisions, getRevisions] as const;
};

const WorkItems: React.FC = () => {
  const workItemAnalysis = useFetchForProject(workItemMetrics);
  const [revisions, getRevisions] = useRevisionsForCollection();
  const [search] = useQueryParam<string>('search');
  const colorsForStages = useRef<Record<string, string>>({});

  const sorterMap = useMemo(() => {
    if (workItemAnalysis === 'loading') return sorters(() => 0);
    const { workItems } = workItemAnalysis;
    if (workItems === null) return sorters(() => 0);
    return sorters((id: number) => workItems.ids[id].length);
  }, [workItemAnalysis]);

  const sorter = useSort(sorterMap, 'Bundle size');

  const colorForStage = useCallback((stageName: string) => {
    if (colorsForStages.current[stageName]) return colorsForStages.current[stageName];
    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colorsForStages.current = { ...colorsForStages.current, [stageName]: randomColor };
    return randomColor;
  }, [colorsForStages]);

  if (workItemAnalysis === 'loading') return <div>Loading...</div>;
  if (!workItemAnalysis.workItems) return <div>No work items found.</div>;

  const { workItems } = workItemAnalysis;
  const topLevelWorkItems = workItems.ids[0].map(id => workItems.byId[id]);

  const filteredWorkItems = topLevelWorkItems
    .filter(search === undefined ? dontFilter : bySearchTerm(search))
    .sort(sorter);

  return (
    <>
      <AppliedFilters type="workitems" count={filteredWorkItems.length} />
      <ul>
        {filteredWorkItems.map((workItem, index) => (
          <WorkItem
            key={workItem.id}
            workItemId={workItem.id}
            workItemsById={workItems.byId}
            workItemsIdTree={workItems.ids}
            colorForStage={colorForStage}
            isFirst={index === 0}
            revisions={revisions}
            getRevisions={getRevisions}
          />
        ))}
      </ul>
    </>
  );
};

export default WorkItems;
