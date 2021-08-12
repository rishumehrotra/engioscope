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

type LeftGraticuleProps = {
  height: number;
  date: Date;
}

const LeftGraticule: React.FC<LeftGraticuleProps> = ({ height, date }) => (
  <g>
    <line
      x1={textWidth + barStartPadding}
      x2={textWidth + barStartPadding}
      y1={0}
      y2={height - axisLabelsHeight}
      stroke="#ddd"
      strokeWidth="1"
      strokeDasharray="3,5"
    />
    <foreignObject
      x={textWidth + barStartPadding - 40}
      y={height - axisLabelsHeight}
      width={80}
      height={20}
    >
      <div className="text-xs text-gray-500 text-center">
        {mediumDate(date)}
      </div>
    </foreignObject>
  </g>
);

const revisionTitle = (revision: UIWorkItemRevision, nextRevision: UIWorkItemRevision) => [
  `${revision.state} → ${nextRevision.state}`,
  `${mediumDate(new Date(revision.date))} → ${mediumDate(new Date(nextRevision.date))}`
].join('\n');

type GanttRowProps = {
  workItem: UIWorkItem;
  isLast: boolean;
  rowIndex: number;
  timeToXCoord: (time: string) => number;
  barWidth: (revisions: UIWorkItemRevision[], index: number) => number;
  colorsForStages: Record<string, string>;
}

const GanttRow: React.FC<GanttRowProps> = ({
  workItem, rowIndex, isLast, timeToXCoord, barWidth, colorsForStages
}) => (
  <g>
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
    <rect
      x="0"
      y={(textHeight + (rowPadding * 2)) * rowIndex}
      width={svgWidth}
      height={textHeight}
      fill={makeTransparent(`#${workItem.color}`)}
    />
    <foreignObject
      x="10"
      y={(textHeight + (rowPadding * 2)) * rowIndex}
      width={textWidth}
      height={textHeight}
    >
      <a
        href={workItem.url}
        className="text-blue-600 truncate w-full flex mt-1 items-center text-sm hover:underline"
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
    </foreignObject>
    {workItem.revisions.slice(0, -1).map((revision, revisionIndex) => (
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
    ))}
  </g>
);

const WorkItemsGanttChart: React.FC<WorkItemsGanttChartProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorsForStages
}) => {
  const workItem = workItemsById[workItemId];
  const workItemChildren = workItemsIdTree[workItemId].map(id => workItemsById[id]);
  const timeToXCoord = createXCoordConverterFor(workItem, workItemChildren);
  const barWidth = barWidthUsing(timeToXCoord);
  const height = svgHeight(workItem, workItemChildren.length);

  return (
    <svg viewBox={`0 0 ${svgWidth} ${height}`}>
      <LeftGraticule
        height={height}
        date={new Date(getMinDateTime(workItem, workItemChildren))}
      />
      {workItemsIdTree[workItemId].map(id => workItemsById[id]).map((workItem, workItemIndex, list) => (
        <GanttRow
          key={workItem.title + workItemIndex}
          isLast={workItemIndex === list.length - 1}
          workItem={workItem}
          rowIndex={workItemIndex}
          timeToXCoord={timeToXCoord}
          barWidth={barWidth}
          colorsForStages={colorsForStages}
        />
      ))}
    </svg>
  );
};

export default WorkItemsGanttChart;
