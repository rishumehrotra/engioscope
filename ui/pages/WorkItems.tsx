import React, { useMemo } from 'react';
import { last } from 'rambda';
import { AnalysedWorkItem, ProjectWorkItemAnalysis } from '../../shared/types';
import WorkItemsGnattChart from '../components/WorkItemsGanttChart';
import { fetchProjectWorkItemAnalysis } from '../network';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes, workItemsSortByParams } from '../types';
import { dontFilter } from '../helpers';
import { useSortOrder, useWorkItemsSortBy } from '../hooks/query-params-hooks';
import useListing from '../hooks/use-listing';

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

const sortByIndicators = (sortBy: typeof workItemsSortByParams[number], sort: -1 | 1) => (
  (a: AnalysedWorkItem, b: AnalysedWorkItem) => {
    if (sortBy === 'Bundle size') {
      return sort * (a.targets.length - b.targets.length);
    }

    return sort * (
      new Date(last(last(a.targets).revisions).date || last(a.targets).created.on).getDate()
      - new Date(b.targets[0].created.on).getDate()
    );
  }
);

type WorkItemProps = {
  workItem: AnalysedWorkItem;
  colorsForStages: Record<string, string>;
};

const WorkItem: React.FC<WorkItemProps> = ({ workItem, colorsForStages }) => (
  <li className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out rounded-lg shadow relative">
    <h3 className="mb-5 flex justify-between">
      <a
        href={workItem.source.url}
        className="text-blue-600 font-bold text-lg truncate inline-block w-4/5 hover:underline"
        target="_blank"
        rel="noreferrer"
        title={workItem.source.title}
      >
        {workItem.source.title}
      </a>
      <span className="text-gray-500 text-sm">
        Bundle size
        {' '}
        {workItem.targets.length}
      </span>
    </h3>
    <WorkItemsGnattChart workItem={workItem} colorsForStages={colorsForStages} />
  </li>
);

const WorkItems: React.FC = () => {
  const workItemAnalysis = useListing<ProjectWorkItemAnalysis, AnalysedWorkItem>({
    fetcher: fetchProjectWorkItemAnalysis,
    list: workItemAnalysis => workItemAnalysis.workItems || []
  });
  const [search] = useUrlParams<string>('search');
  const [sort] = useSortOrder();
  const [sortBy] = useWorkItemsSortBy();

  const colorsForStages = useMemo(() => {
    if (workItemAnalysis === 'loading') return {};
    return workItemAnalysis.list ? createColorPalette(workItemAnalysis.list) : {};
  }, [workItemAnalysis]);

  if (workItemAnalysis === 'loading') return <div>Loading...</div>;

  const filteredWorkItems = workItemAnalysis.list
    ?.filter(search === undefined ? dontFilter : bySearchTerm(search))
    .sort(sortByIndicators(sortBy, sort === 'asc' ? 1 : -1));

  return (
    <ul>
      {filteredWorkItems?.map(workItem => (
        <WorkItem
          key={workItem.source.id}
          workItem={workItem}
          colorsForStages={colorsForStages}
        />
      ))}
    </ul>
  );
};

export default WorkItems;
