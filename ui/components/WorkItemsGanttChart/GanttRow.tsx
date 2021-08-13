import React from 'react';
import { UIWorkItem } from '../../../shared/types';
import {
  textWidth, textHeight,
  rowPadding, svgWidth, makeTransparent, barYCoord,
  barHeight, revisionTitle, contrastColour, barWidthUsing
} from './helpers';
import { TreeNodeButton } from './TreeNodeButton';
import { ExpandedState } from './types';

export type GanttRowProps = {
  workItem: UIWorkItem;
  isLast: boolean;
  rowIndex: number;
  indentation: number;
  expandedState: ExpandedState;
  timeToXCoord: (time: string) => number;
  onToggle: (e: React.MouseEvent) => void;
  colorsForStages: Record<string, string>;
};

export const GanttRow: React.FC<GanttRowProps> = ({
  workItem, rowIndex, indentation, isLast, timeToXCoord,
  colorsForStages, expandedState, onToggle
}) => {
  const barWidth = barWidthUsing(timeToXCoord);
  return (
    <g>
      <rect
      // background
        x="0"
        y={(textHeight + (rowPadding * 2)) * rowIndex}
        width={svgWidth}
        height={textHeight}
        fill={makeTransparent(`#${workItem.color}`)}
      />
      <foreignObject
      // The stuff on the left
        x="10"
        y={(textHeight + (rowPadding * 2)) * rowIndex}
        width={textWidth}
        height={textHeight}
      >
        <div className="flex items-center">
          <TreeNodeButton
            expandedState={expandedState}
            onToggle={onToggle}
            indentation={indentation}
          />
          <a
            href={workItem.url}
            className="text-blue-600 truncate flex mt-1 items-center text-sm hover:underline"
            style={{ width: `${textWidth}px` }}
            target="_blank"
            rel="noreferrer"
            title={`${workItem.type}: ${workItem.title}`}
          >
            <img
              src={workItem.icon}
              alt={`Icon for ${workItem.type}`}
              width="16"
              className="float-left mr-1"
            />
            {workItem.title}
          </a>
        </div>
      </foreignObject>
      {workItem.revisions.slice(0, -1).map((revision, revisionIndex) => (
      // The actual gantt bar
        <g key={revision.state + revision.date}>
          <rect
            x={timeToXCoord(revision.date)}
            y={barYCoord(rowIndex)}
            width={barWidth(workItem.revisions, revisionIndex)}
            height={barHeight}
            fill={colorsForStages[revision.state]}
            key={revision.date}
          >
            <title>
              {revisionTitle(revision, workItem.revisions[revisionIndex + 1])}
            </title>
          </rect>
          {barWidth(workItem.revisions, revisionIndex) > 25 ? (
            <foreignObject
              x={timeToXCoord(revision.date)}
              y={barYCoord(rowIndex)}
              width={barWidth(workItem.revisions, revisionIndex)}
              height={barHeight}
              className="pointer-events-none"
            >
              <span
                style={{ color: contrastColour(colorsForStages[revision.state]) }}
                className="text-xs pl-1 truncate inline-block w-full"
              >
                {revisionTitle(revision, workItem.revisions[revisionIndex + 1]).replace('\n', ', ')}
              </span>
            </foreignObject>
          ) : null}
        </g>
      ))}
      {!isLast ? (
        <line
          x1="0"
          y1={(textHeight + (rowPadding * 2)) * rowIndex - rowPadding}
          x2={svgWidth}
          y2={(textHeight + (rowPadding * 2)) * rowIndex - rowPadding}
          strokeWidth="1"
          stroke="#ddd"
        />
      ) : null}
    </g>
  );
};
