import React, { useMemo } from 'react';
import { AnalysedWorkItem, ProjectWorkItemAnalysis } from '../../shared/types';
import WorkItemsGnattChart from '../components/WorkItemsGnattChart';

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

const WorkItems: React.FC<{ workItemAnalysis: ProjectWorkItemAnalysis | undefined }> = ({ workItemAnalysis }) => {
  const colorsForStages = useMemo(() => (
    workItemAnalysis?.workItems ? createColorPalette(workItemAnalysis.workItems) : {}
  ), [workItemAnalysis]);

  if (!workItemAnalysis) return <div>Loading...</div>;

  return (
    <div>
      <div className="mb-4">
        Tasks named
        {' '}
        "
        {workItemAnalysis.taskType}
        " -
        {' '}
        {workItemAnalysis.workItems?.length}
      </div>
      <ul>
        {workItemAnalysis.workItems?.map(workItem => (
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
