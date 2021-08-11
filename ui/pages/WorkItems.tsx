import React, { useMemo } from 'react';
import { UIWorkItem } from '../../shared/types';
import { workItemMetrics } from '../network';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes } from '../types';
import { dontFilter } from '../helpers/utils';
import WorkItem from '../components/WorkItemHealth';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { SortMap, useSort } from '../hooks/sort-hooks';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const colorPalette = [
  '#2ab7ca', '#fed766', '#0e9aa7', '#3da4ab',
  '#f6cd61', '#fe8a71', '#96ceb4', '#ffeead',
  '#ff6f69', '#ffcc5c', '#88d8b0', '#a8e6cf',
  '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94',
  '#00b159', '#00aedb', '#f37735', '#ffc425',
  '#edc951', '#eb6841', '#00a0b0', '#fe4a49'
];

const createColorPalette = (workItemsMap: Record<number, UIWorkItem>) => {
  const states = Object.values(workItemsMap).flatMap(wi => wi.revisions.map(r => r.state));

  return [...new Set(states)]
    .reduce<Record<string, string>>((acc, state, index) => ({
      ...acc,
      [state]: colorPalette[index % colorPalette.length]
    }), {});
};

const bySearchTerm = (searchTerm: string) => (workItem: UIWorkItem) => (
  workItem.title.toLowerCase().includes(searchTerm.toLowerCase())
);

const sorters = (childrenCount: (id: number) => number): SortMap<UIWorkItem> => ({
  'Bundle size': (a, b) => childrenCount(a.id) - childrenCount(b.id)
});

const WorkItems: React.FC = () => {
  const workItemAnalysis = useFetchForProject(workItemMetrics);
  const [search] = useUrlParams<string>('search');

  const sorterMap = useMemo(() => {
    if (workItemAnalysis === 'loading') return sorters(() => 0);
    const { workItems } = workItemAnalysis;
    if (workItems === null) return sorters(() => 0);
    return sorters((id: number) => workItems.ids[id].length);
  }, [workItemAnalysis]);

  const sorter = useSort(sorterMap, 'Bundle size');

  const colorsForStages = useMemo(() => {
    if (workItemAnalysis === 'loading') return {};
    if (workItemAnalysis.workItems === null) return {};
    return workItemAnalysis.workItems.ids ? createColorPalette(workItemAnalysis.workItems.byId) : {};
  }, [workItemAnalysis]);

  if (workItemAnalysis === 'loading') return <div>Loading...</div>;
  if (!workItemAnalysis.workItems) return <div>No work items found.</div>;

  const { workItems } = workItemAnalysis;
  const topLevelWorkItems = workItems.ids[0].map(id => workItems.byId[id]);

  const filteredWorkItems = topLevelWorkItems
    .filter(search === undefined ? dontFilter : bySearchTerm(search))
    .sort(sorter);

  return (
    <ul>
      {filteredWorkItems.map((workItem, index) => (
        <WorkItem
          key={workItem.id}
          workItemId={workItem.id}
          workItemsById={workItems.byId}
          workItemsIdTree={workItems.ids}
          colorsForStages={colorsForStages}
          isFirst={index === 0}
        />
      ))}
    </ul>
  );
};

export default WorkItems;
