import React, { useCallback } from 'react';
import type {
  AnalysedWorkItems, UIWorkItem, UIWorkItemRevision, UIWorkItemType
} from '../../shared/types';
import WorkItemsGanttChart from './WorkItemsGanttChart';
import { Revisions } from './WorkItemsGanttChart/GanttRow';
import {
  barHeight,
  barWidthUsing, getMaxDateTime, getMinDateTime, rowPadding, svgWidth
} from './WorkItemsGanttChart/helpers';

const titleTooltip = (workItem: UIWorkItem, type: UIWorkItemType) => `
  <div class="max-w-xs">
    <div class="pl-3" style="text-indent: -1.15rem">
      <span class="font-bold">
        <img src="${type.icon}" width="14" height="14" class="inline-block -mt-1" />
        ${type.name[0]} #${workItem.id}:
      </span>
      ${workItem.title}
    </div>
    ${workItem.env ? (`
      <div class="mt-2">
        <span class="font-bold">Environment: </span>
        ${workItem.env}
      </div>
    `) : ''}
    <div class="mt-2">
      <span class="font-bold">Project: </span>
      ${workItem.project}
    </div>
  </div>
`;

export const xCoordConverterWithin = (minDateTime: number, maxDateTime: number) => (
  (time: string | Date) => {
    const date = new Date(time);
    const xCoordWithoutText = (
      (date.getTime() - minDateTime)
      / (maxDateTime - minDateTime)
    ) * (svgWidth);
    return (xCoordWithoutText < 0 ? 0 : xCoordWithoutText);
  }
);

export const createXCoordConverterFor = (revisions: UIWorkItemRevision[]) => {
  const minDateTime = getMinDateTime(revisions);
  const maxDateTime = getMaxDateTime(revisions);

  return xCoordConverterWithin(minDateTime, maxDateTime);
};

type WorkItemProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  workItemType: (workItem: UIWorkItem) => UIWorkItemType;
  colorForStage: (stage: string) => string;
  revisions: Record<string, 'loading' | UIWorkItemRevision[]>;
  getRevisions: (workItemIds: number[]) => void;
};

const WorkItem: React.FC<WorkItemProps> = ({
  workItemId, workItemsById, workItemsIdTree, workItemType,
  colorForStage, revisions, getRevisions
}) => {
  const workItemRevisions = revisions[workItemId];
  const workItem = workItemsById[workItemId];

  const timeToXCoord = useCallback<ReturnType<typeof xCoordConverterWithin>>((time: string | Date) => {
    const coordsGetter = workItemRevisions === 'loading'
      ? () => 0
      : createXCoordConverterFor(workItemRevisions);
    return coordsGetter(time);
  }, [workItemRevisions]);

  const barWidth = barWidthUsing(timeToXCoord);

  return (
    <div
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out
      rounded-lg shadow relative workitem-body"
      style={{ contain: 'content' }}
    >
      <h3 className="flex justify-between">
        <div className="w-4/5">
          <a
            href={workItem.url}
            className="font-bold text-lg truncate max-width-full inline-block link-text"
            target="_blank"
            rel="noreferrer"
            data-tip={titleTooltip(workItem, workItemType(workItem))}
            data-html
          >
            <img
              className="inline-block -mt-1 mr-1"
              src={workItemType(workItem).icon}
              alt={`${workItemType(workItem).name[1]} icon`}
              width="18"
            />
            {`${workItem.id}: ${workItem.title}`}
          </a>

        </div>
      </h3>
      <div className="flex items-end mb-2">
        <div className="font-semibold text-sm mr-2">Timeline:</div>
        {
          workItemRevisions
            ? (
              <svg
                viewBox={`0 0 ${svgWidth} ${barHeight + 2 * rowPadding}`}
                height="100%"
                width="100%"
              >
                <Revisions
                  revisions={workItemRevisions}
                  barWidth={barWidth}
                  colorForStage={colorForStage}
                  rowIndex={0}
                  timeToXCoord={timeToXCoord}
                />
              </svg>
            ) : null
        }
      </div>
      <div className="mt-4 cursor-default">
        <WorkItemsGanttChart
          workItemId={workItemId}
          workItemsById={workItemsById}
          workItemsIdTree={workItemsIdTree}
          workItemType={workItemType}
          colorForStage={colorForStage}
          revisions={revisions}
          getRevisions={getRevisions}
        />
      </div>
    </div>
  );
};

export default WorkItem;
