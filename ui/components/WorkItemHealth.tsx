import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import React, { useState } from 'react';
import type { AnalysedWorkItems, UIWorkItem, UIWorkItemRevision } from '../../shared/types';
import { exists } from '../helpers/utils';
import { DownChevron, UpChevron } from './common/Icons';
import WorkItemsGanttChart from './WorkItemsGanttChart';

const titleTooltip = (workItem: UIWorkItem) => `
  <div class="max-w-xs">
    <div class="pl-3" style="text-indent: -1.15rem">
      <span class="font-bold">
        <img src="${workItem.icon}" width="14" height="14" class="inline-block -mt-1" />
        ${workItem.type} #${workItem.id}:
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

type WorkItemProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  colorForStage: (stage: string) => string;
  isFirst?: boolean;
  revisions: Record<string, 'loading' | UIWorkItemRevision[]>;
  getRevisions: (workItemIds: number[]) => void;
};

type WorkItemStats = {
  bugs: number;
  features: number;
  clts: (number | undefined)[];
};

const WorkItem: React.FC<WorkItemProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorForStage,
  isFirst, revisions, getRevisions
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isFirst || false);

  const workItem = workItemsById[workItemId];

  const { bugs, features, clts } = (workItemsIdTree[workItemId] || [])
    .reduce<WorkItemStats>((acc, id) => {
      const workItem = workItemsById[id];
      return {
        bugs: workItem.type === 'Bug' ? acc.bugs + 1 : acc.bugs,
        features: workItem.type === 'Feature' ? acc.features + 1 : acc.features,
        clts: [
          ...acc.clts,
          workItem.clt?.start && workItem.clt.end
            ? (new Date(workItem.clt?.end).getTime() - new Date(workItem.clt?.start).getTime())
            : undefined
        ]
      };
    }, {
      bugs: 0,
      features: 0,
      clts: []
    });

  const filteredClts = clts.filter(exists);

  return (
    <li
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out
      rounded-lg shadow relative workitem-body"
      style={{ contain: 'content' }}
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
              {`${workItem.id}: ${workItem.title}`}
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
            {': '}
            <span className="font-semibold">
              {`${(workItemsIdTree[workItemId] || []).length}`}
            </span>
            <span>
              {` (${features} features ${bugs} bugs)`}
            </span>
          </span>
          { filteredClts.length
            ? (
              <span className="text-blue-gray text-sm my-2 ml-2">
                <span>|&nbsp;&nbsp;CLT:  </span>
                <span className="font-semibold">
                  {`${prettyMilliseconds(Math.min(...filteredClts), { compact: true })} - 
                  ${prettyMilliseconds(Math.max(...filteredClts), { compact: true })}`}
                </span>
                <span>
                  {` (average ${prettyMilliseconds(filteredClts.reduce(add, 0) / filteredClts.length, { compact: true })})`}
                </span>
              </span>
            )
            : null}
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
