import React, {
  useState
} from 'react';
import type { AnalysedWorkItems } from '../../../shared/types';
import { GanttRow } from './GanttRow';
import { Graticule } from './Graticule';
import {
  svgWidth, createXCoordConverterFor,
  svgHeight, getMinDateTime, axisLabelsHeight
} from './helpers';
import type { ExpandedState } from './types';
import { useMouseEvents } from './use-crosshairs';

const workItemIdFromRowPath = (rowPath: string) => Number(rowPath.split('/').pop());
const indentation = (rowPath: string) => rowPath.split('/').length - 1;

const expandedState = (
  rowPath: string,
  renderedRowPaths: string[],
  workItemsIdTree: Record<number, number[]>
): ExpandedState => {
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

export type WorkItemsGanttChartProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  colorsForStages: Record<string, string>;
};

const WorkItemsGanttChart: React.FC<WorkItemsGanttChartProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorsForStages
}) => {
  const [rowPathsToRender, setRowPathsToRender] = useState(workItemsIdTree[workItemId].map(String));
  const [svgRef, crosshairRef] = useMouseEvents();
  const workItem = workItemsById[workItemId];
  const workItemChildren = workItemsIdTree[workItemId].map(id => workItemsById[id]);
  const timeToXCoord = createXCoordConverterFor(workItem, workItemChildren);
  const height = svgHeight(rowPathsToRender.length);

  return (
    <svg viewBox={`0 0 ${svgWidth} ${height}`} ref={svgRef}>
      <Graticule
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
          onToggle={e => {
            e.stopPropagation();
            setRowPathsToRender(toggleExpandState(rowPath, workItemsIdTree));
          }}
          expandedState={expandedState(rowPath, rowPathsToRender, workItemsIdTree)}
          colorsForStages={colorsForStages}
        />
      ))}
      <line
        ref={crosshairRef}
        y1={0}
        y2={height - axisLabelsHeight}
        x1={0}
        x2={0}
        stroke="#999"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
    </svg>
  );
};

export default WorkItemsGanttChart;
