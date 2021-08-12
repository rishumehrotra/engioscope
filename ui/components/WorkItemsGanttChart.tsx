import React, { useState } from 'react';
import { AnalysedWorkItems, UIWorkItem, UIWorkItemRevision } from '../../shared/types';
import { mediumDate } from '../helpers/utils';
import { Minus, Plus } from './common/Icons';

const svgWidth = 1200;
const textWidth = 300;
const textHeight = 30;
const barStartPadding = 30;
const barHeight = 20;
const rowPadding = 3;
const axisLabelsHeight = 20;

const svgHeight = (childrenCount: number) => (
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

const Reticule: React.FC<LeftGraticuleProps> = ({ height, date }) => (
  <g>
    <line
      x1={textWidth + barStartPadding}
      x2={textWidth + barStartPadding}
      y1={0}
      y2={height - axisLabelsHeight}
      stroke="#ccc"
      strokeWidth="2"
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
  indentation: number;
  expandedState: 'collapsed' | 'expanded' | 'no-children';
  timeToXCoord: (time: string) => number;
  onToggle: () => void;
  barWidth: (revisions: UIWorkItemRevision[], index: number) => number;
  colorsForStages: Record<string, string>;
}

const GanttRow: React.FC<GanttRowProps> = ({
  workItem, rowIndex, indentation, isLast, timeToXCoord,
  barWidth, colorsForStages, expandedState, onToggle
}) => (
  <g>
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
      <div className="flex items-center">
        {expandedState === 'collapsed' ? (
          <button style={{ marginLeft: `${indentation * 20}px` }} className="inline-block w-4 h-4 mt-1 mr-2" onClick={onToggle}>
            <Plus />
          </button>
        ) : null}
        {expandedState === 'expanded' ? (
          <button style={{ marginLeft: `${indentation * 20}px` }} className="inline-block w-4 h-4 mt-1 mr-2" onClick={onToggle}>
            <Minus />
          </button>
        ) : null}
        {expandedState === 'no-children' ? (
          <span style={{ marginLeft: `${(indentation * 20) + 0}px` }} className="inline-block w-4 h-4 mt-1 mr-2">
            {' '}
          </span>
        ) : null}
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

const workItemIdFromRowPath = (rowPath: string) => Number(rowPath.split('/').pop());
const indentation = (rowPath: string) => rowPath.split('/').length - 1;
const expandedState = (
  rowPath: string,
  renderedRowPaths: string[],
  workItemsIdTree: Record<number, number[]>
): GanttRowProps['expandedState'] => {
  const workItemId = workItemIdFromRowPath(rowPath);
  if (!workItemsIdTree[workItemId]) return 'no-children';
  return renderedRowPaths.filter(r => r.startsWith(rowPath)).length === 1
    ? 'collapsed'
    : 'expanded';
};
const toggleExpandState = (rowPath: string, workItemsIdTree: Record<number, number[]>) => (
  (renderedRowPaths: string[]) => {
    const state = expandedState(rowPath, renderedRowPaths, workItemsIdTree);
    if (state === 'no-children') return renderedRowPaths;
    if (state === 'expanded') return renderedRowPaths.filter(r => !r.startsWith(`${rowPath}/`));
    return [
      ...renderedRowPaths.slice(0, renderedRowPaths.indexOf(rowPath) + 1),
      ...workItemsIdTree[workItemIdFromRowPath(rowPath)].map(id => `${rowPath}/${id}`),
      ...renderedRowPaths.slice(renderedRowPaths.indexOf(rowPath) + 1)
    ];
  }
);

const WorkItemsGanttChart: React.FC<WorkItemsGanttChartProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorsForStages
}) => {
  const workItem = workItemsById[workItemId];
  const workItemChildren = workItemsIdTree[workItemId].map(id => workItemsById[id]);
  const [rowPathsToRender, setRowPathsToRender] = useState(workItemsIdTree[workItemId].map(String));
  const timeToXCoord = createXCoordConverterFor(workItem, workItemChildren);
  const barWidth = barWidthUsing(timeToXCoord);
  const height = svgHeight(rowPathsToRender.length);

  return (
    <svg viewBox={`0 0 ${svgWidth} ${height}`}>
      <Reticule
        height={height}
        date={new Date(getMinDateTime(workItem, workItemChildren))}
      />
      {rowPathsToRender.map((rowPath, rowIndex, list) => (
        <GanttRow
          key={rowPath}
          isLast={rowIndex === list.length - 1}
          workItem={workItemsById[workItemIdFromRowPath(rowPath)]}
          indentation={indentation(rowPath)}
          rowIndex={rowIndex}
          timeToXCoord={timeToXCoord}
          barWidth={barWidth}
          onToggle={() => setRowPathsToRender(toggleExpandState(rowPath, workItemsIdTree))}
          expandedState={expandedState(rowPath, rowPathsToRender, workItemsIdTree)}
          colorsForStages={colorsForStages}
        />
      ))}
    </svg>
  );
};

export default WorkItemsGanttChart;
