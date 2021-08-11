import React from 'react';
import { AnalysedWorkItems, UIWorkItem, UIWorkItemRevision } from '../../shared/types';
import { mediumDate } from '../helpers/utils';

const svgWidth = 1200;
const textWidth = 300;
const textHeight = 30;
const barStartPadding = 30;
const barHeight = 20;
const rowPadding = 3;
const axisLabelsHeight = 20;

const svgHeight = (workItem: UIWorkItem, childrenCount: number) => (
  ((textHeight + (rowPadding * 2)) * childrenCount) + axisLabelsHeight
);

const barYCoord = (targetIndex: number) => (
  (targetIndex * (textHeight + (rowPadding * 2))) + ((textHeight - barHeight) / 2)
);

type WorkItemsGanttChartProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  colorsForStages: Record<string, string>;
};

const getMinDateTime = (workItem: UIWorkItem, children: UIWorkItem[]) => Math.min(
  new Date(workItem.revisions[0].date).getTime(),
  ...children.map(child => new Date(child.revisions[0].date).getTime())
);

const getMaxDateTime = (workItem: UIWorkItem, children: UIWorkItem[]) => Math.max(
  new Date(workItem.revisions[workItem.revisions.length - 1].date).getTime(),
  ...children.map(child => new Date(child.revisions[child.revisions.length - 1].date).getTime())
);

const createXCoordConverterFor = (workItem: UIWorkItem, children: UIWorkItem[]) => {
  const minDateTime = getMinDateTime(workItem, children);
  const maxDateTime = getMaxDateTime(workItem, children);

  return (time: string) => {
    const date = new Date(time);

    return ((
      (date.getTime() - minDateTime)
      / (maxDateTime - minDateTime)
    ) * (svgWidth - textWidth - barStartPadding)) + textWidth + barStartPadding;
  };
};

const barWidthUsing = (timeToXCoord: (time: string) => number) => (
  (revisions: UIWorkItemRevision[], index: number) => {
    if (revisions.length === 1) {
      return Math.max(svgWidth - timeToXCoord(revisions[0].date), 3);
    }
    return Math.max(timeToXCoord(revisions[index + 1].date) - timeToXCoord(revisions[index].date), 3);
  }
);

const makeTransparent = (rgb: string) => {
  if (rgb.length > 7) { // already has a rgbA component
    return `${rgb.slice(0, -2)}11`;
  }

  return `${rgb}11`;
};

const WorkItemsGanttChart: React.FC<WorkItemsGanttChartProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorsForStages
}) => {
  const workItem = workItemsById[workItemId];
  const workItemChildren = workItemsIdTree[workItemId].map(id => workItemsById[id]);
  const timeToXCoord = createXCoordConverterFor(workItem, workItemChildren);
  const barWidth = barWidthUsing(timeToXCoord);

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight(workItem, workItemChildren.length)}`}>
      <line
        x1={textWidth + barStartPadding}
        x2={textWidth + barStartPadding}
        y1={0}
        y2={svgHeight(workItem, workItemChildren.length) - axisLabelsHeight}
        stroke="#ddd"
        strokeWidth="1"
        strokeDasharray="3,5"
      />
      <foreignObject
        x={textWidth + barStartPadding - 40}
        y={svgHeight(workItem, workItemChildren.length) - axisLabelsHeight}
        width={80}
        height={20}
      >
        <div className="text-xs text-gray-500 text-center">
          {mediumDate(new Date(getMinDateTime(workItem, workItemChildren)))}
        </div>
      </foreignObject>
      {workItemsIdTree[workItemId].map(id => workItemsById[id]).map((childWorkItem, targetIndex, list) => (
        // eslint-disable-next-line react/no-array-index-key
        <g key={childWorkItem.title + targetIndex}>
          {targetIndex <= list.length - 1 ? (
            <line
              x1="0"
              y1={(textHeight + (rowPadding * 2)) * targetIndex - rowPadding}
              x2={svgWidth}
              y2={(textHeight + (rowPadding * 2)) * targetIndex - rowPadding}
              strokeWidth="1"
              stroke="#ddd"
            />
          ) : null}
          <rect
            x="0"
            y={(textHeight + (rowPadding * 2)) * targetIndex}
            width={svgWidth}
            height={textHeight}
            fill={makeTransparent(`#${childWorkItem.color}`)}
          />
          <foreignObject
            x="10"
            y={(textHeight + (rowPadding * 2)) * targetIndex}
            width={textWidth}
            height={textHeight}
          >
            <a
              href={childWorkItem.url}
              className="text-blue-600 truncate w-full flex mt-1 items-center text-sm hover:underline"
              style={{ width: `${textWidth}px` }}
              target="_blank"
              rel="noreferrer"
              title={`${childWorkItem.type}: ${childWorkItem.title}`}
            >
              <img
                src={childWorkItem.icon}
                alt={`Icon for ${childWorkItem.type}`}
                width="16"
                className="float-left mr-1"
              />
              {childWorkItem.title}
            </a>
          </foreignObject>
          {childWorkItem.revisions.slice(0, -1).map((revision, index) => (
            <rect
              x={timeToXCoord(revision.date)}
              y={barYCoord(targetIndex)}
              width={barWidth(childWorkItem.revisions, index)}
              height={barHeight}
              fill={colorsForStages[revision.state]}
              key={revision.date}
            >
              <title>
                {`${revision.state} → ${childWorkItem.revisions[index + 1].state}`}
                {'\n'}
                {`${mediumDate(new Date(revision.date))} → ${mediumDate(new Date(childWorkItem.revisions[index + 1].date))}`}
              </title>
            </rect>
          ))}
        </g>
      ))}
    </svg>
  );
};

export default WorkItemsGanttChart;
