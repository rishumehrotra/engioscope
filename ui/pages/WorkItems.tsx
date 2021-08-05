import React, { useEffect, useMemo, useState } from 'react';
import { AnalysedWorkItem, ProjectWorkItemAnalysis } from '../../shared/types';
import WorkItemsGnattChart from '../components/WorkItemsGnattChart';
import { fetchProjectWorkItemAnalysis } from '../network';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes } from '../types';
import { dontFilter } from '../helpers';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const colorPalette = [
  '#2ab7ca', '#fed766',
  '#0e9aa7', '#3da4ab', '#f6cd61', '#fe8a71',
  '#96ceb4', '#ffeead', '#ff6f69', '#ffcc5c', '#88d8b0',
  '#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94',
  '#00b159', '#00aedb', '#f37735', '#ffc425',
  '#edc951', '#eb6841', '#00a0b0', '#fe4a49'
];

const createColorPalette = (workItems: AnalysedWorkItem[]) => {
  const stageNames = workItems
    .flatMap(
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

const WorkItems: React.FC<{ collection: string; project:string }> = ({ collection, project }) => {
  const [workItemAnalysis, setWorkItemAnalysis] = useState<ProjectWorkItemAnalysis | undefined>();
  const [search] = useUrlParams<string>('search');

  useEffect(() => {
    fetchProjectWorkItemAnalysis(collection, project).then(setWorkItemAnalysis);
  }, [collection, project]);

  const colorsForStages = useMemo(() => (
    workItemAnalysis?.workItems ? createColorPalette(workItemAnalysis.workItems) : {}
  ), [workItemAnalysis]);

  if (!workItemAnalysis) return <div>Loading...</div>;

  const filteredWorkItems = workItemAnalysis.workItems?.filter(search === undefined ? dontFilter : bySearchTerm(search));

  return (
    <div>
      <ul>
        {filteredWorkItems?.sort((a, b) => b.targets.length - a.targets.length).map(workItem => (
          <li
            key={workItem.source.id}
            className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out rounded-lg shadow relative"
          >
            <h3 className="mb-2">
              <a
                href={workItem.source.url}
                className="text-blue-600 font-bold text-lg truncate inline-block w-full hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {workItem.source.title}
              </a>
            </h3>
            <WorkItemsGnattChart workItem={workItem} colorsForStages={colorsForStages} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkItems;
