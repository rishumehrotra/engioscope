import React, { useMemo } from 'react';
import { AnalysedWorkItem } from '../../shared/types';
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

const createColorPalette = (workItems: AnalysedWorkItem[]) => {
  const stageNames = workItems.flatMap(
    workItem => workItem.targets
      .flatMap(target => target.revisions.flatMap(rev => rev.state))
  );

  return [...new Set(stageNames)]
    .reduce<Record<string, string>>((acc, state, index) => ({
      ...acc,
      [state]: colorPalette[index % colorPalette.length]
    }), {});
};

const bySearchTerm = (searchTerm: string) => (workItem: AnalysedWorkItem) => (
  workItem.source.title.toLowerCase().includes(searchTerm.toLowerCase())
);

const sorters: SortMap<AnalysedWorkItem> = {
  'Bundle size': (a, b) => a.targets.length - b.targets.length
};

const WorkItems: React.FC = () => {
  const workItemAnalysis = useFetchForProject(workItemMetrics);
  const sorter = useSort(sorters, 'Bundle size');
  const [search] = useUrlParams<string>('search');

  const colorsForStages = useMemo(() => {
    if (workItemAnalysis === 'loading') return {};
    return workItemAnalysis.workItems ? createColorPalette(workItemAnalysis.workItems) : {};
  }, [workItemAnalysis]);

  if (workItemAnalysis === 'loading') return <div>Loading...</div>;

  const filteredWorkItems = workItemAnalysis.workItems
    ?.filter(search === undefined ? dontFilter : bySearchTerm(search))
    .sort(sorter);

  return (
    <ul>
      {filteredWorkItems?.map((workItem, index) => (
        <WorkItem
          key={workItem.source.id}
          workItem={workItem}
          colorsForStages={colorsForStages}
          isFirst={index === 0}
        />
      ))}
    </ul>
  );
};

export default WorkItems;
