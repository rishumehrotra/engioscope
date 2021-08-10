import React, { useState } from 'react';
import { AnalysedWorkItem } from '../../shared/types';
import { DownChevron, UpChevron } from './common/Icons';
import WorkItemsGanttChart from './WorkItemsGanttChart';

type WorkItemProps = {
  workItem: AnalysedWorkItem;
  colorsForStages: Record<string, string>;
  isFirst: boolean;
};

const WorkItem: React.FC<WorkItemProps> = ({ workItem, colorsForStages, isFirst }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isFirst);
  const [isHover, setIsHover] = useState<boolean>(false);

  return (
    <div
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out rounded-lg shadow relative w-full text-left"
      onMouseEnter={() => setIsHover(!isHover)}
      onMouseLeave={() => setIsHover(!isHover)}
    >
      <h3 className="flex justify-between">
        <div className="w-4/5">
          <a
            href={workItem.source.url}
            className="text-blue-600 font-bold text-lg truncate max-width-full inline-block hover:underline"
            target="_blank"
            rel="noreferrer"
            title={workItem.source.title}
          >
            {workItem.source.title}
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
          <span className="font-semibold text-base">{workItem.targets.length}</span>
          {' | '}
        </span>
        <span className="text-blue-gray text-sm my-2">
          Cycle time
          {' '}
          <span className="font-semibold text-base">25 days</span>
        </span>
      </div>

      {isExpanded ? (
        <div className="mt-4"><WorkItemsGanttChart workItem={workItem} colorsForStages={colorsForStages} /></div>
      ) : null}
    </div>
  );
};

export default WorkItem;
