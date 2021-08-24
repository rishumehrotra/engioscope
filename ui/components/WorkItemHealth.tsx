import React, { useState } from 'react';
import type { AnalysedWorkItems, UIWorkItem, UIWorkItemRevision } from '../../shared/types';
import { DownChevron, UpChevron } from './common/Icons';
import WorkItemsGanttChart from './WorkItemsGanttChart';

const titleTooltip = (workItem: UIWorkItem) => `
  <div class="max-w-xs">
    <span class="font-bold">
      <img src="${workItem.icon}" width="14" height="14" class="inline-block -mt-1" />
      ${workItem.type} #${workItem.id}:
    </span>
    ${workItem.title}
    <div class="mt-2">
      <span class="font-bold">Project: </span>
      ${workItem.project}
    </div>
  </div>
`;

type WorkItemProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  colorForStage: (stage: string) => string;
  isFirst: boolean;
  revisions: Record<string, 'loading' | UIWorkItemRevision[]>;
  getRevisions: (workItemIds: number[]) => void;
};

const WorkItem: React.FC<WorkItemProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorForStage,
  isFirst, revisions, getRevisions
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isFirst);

  const workItem = workItemsById[workItemId];

  return (
    <li
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out
      rounded-lg shadow relative workitem-body"
    >
      <button
        className="w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex justify-between">
          <div className="w-4/5">
            <a
              href={workItem.url}
              className="font-bold text-lg truncate max-width-full inline-block link-text"
              target="_blank"
              rel="noreferrer"
              data-tip={titleTooltip(workItem)}
              data-html
            >
              <img
                className="inline-block -mt-1 mr-1"
                src={workItem.icon}
                alt={`${workItem.type} icon`}
                width="18"
              />
              {workItem.title}
            </a>
          </div>
          {isExpanded ? (
            <span className="flex text-gray-500">
              <span>Show less</span>
              <UpChevron />
            </span>
          ) : (
            <span className="flex text-gray-500">
              <span className="show-more">Show more</span>
              <DownChevron />
            </span>
          )}
        </h3>
        <div className="text-base font-normal text-gray-800">
          <span className="text-blue-gray text-sm my-2">
            Bundle size
            {' '}
            <span className="font-semibold text-base">{(workItemsIdTree[workItemId] || []).length}</span>
          </span>
        </div>
      </button>
      {isExpanded ? (
        <div className="mt-4 cursor-default">
          <WorkItemsGanttChart
            workItemId={workItemId}
            workItemsById={workItemsById}
            workItemsIdTree={workItemsIdTree}
            colorForStage={colorForStage}
            revisions={revisions}
            getRevisions={getRevisions}
          />
        </div>
      ) : null}
    </li>
  );
};

export default WorkItem;
