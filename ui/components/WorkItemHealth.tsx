import React, { useCallback, useState } from 'react';
import { AnalysedWorkItems } from '../../shared/types';
import { DownChevron, UpChevron } from './common/Icons';
import WorkItemsGanttChart from './WorkItemsGanttChart';

type WorkItemProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  colorsForStages: Record<string, string>;
  isFirst: boolean;
};

const WorkItem: React.FC<WorkItemProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorsForStages, isFirst
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isFirst);
  const [isHover, setIsHover] = useState<boolean>(false);
  const toggleHover = useCallback(() => setIsHover(!isHover), [isHover]);

  const workItem = workItemsById[workItemId];

  return (
    <div
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out rounded-lg shadow relative w-full text-left"
      onMouseEnter={toggleHover}
      onMouseLeave={toggleHover}
    >
      <h3 className="flex justify-between">
        <div className="w-4/5">
          <a
            href={workItem.url}
            className="text-blue-600 font-bold text-lg truncate max-width-full inline-block hover:underline"
            target="_blank"
            rel="noreferrer"
            title={workItem.title}
          >
            {workItem.title}
          </a>
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? (
            <span className="flex text-gray-500">
              <span>Show less</span>
              <UpChevron />
            </span>
          ) : (
            <span className="flex text-gray-500">
              {isHover ? <span>Show more</span> : null}
              <DownChevron />
            </span>
          )}
        </button>
      </h3>
      <div className="text-base font-normal text-gray-800">
        <span className="text-blue-gray text-sm my-2">
          Bundle size
          {' '}
          <span className="font-semibold text-base">{workItemsIdTree[workItemId].length}</span>
        </span>
      </div>
      {isExpanded ? (
        <div className="mt-4">
          <WorkItemsGanttChart
            workItemId={workItemId}
            workItemsById={workItemsById}
            workItemsIdTree={workItemsIdTree}
            colorsForStages={colorsForStages}
          />
        </div>
      ) : null}
    </div>
  );
};

export default WorkItem;
