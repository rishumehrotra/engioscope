import React, { useCallback, useRef, useState } from 'react';
import type { AnalysedWorkItems } from '../../../shared/types';
import DragZoom from './DragZoom';
import { GanttRow } from './GanttRow';
import { Graticule } from './Graticule';
import {
  svgWidth, createXCoordConverterFor, svgHeight, getMinDateTime, getMaxDateTime, xCoordConverterWithin
} from './helpers';
import type { ExpandedState } from './types';
import VerticalCrosshair from './VerticalCrosshair';

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
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const workItem = workItemsById[workItemId];
  const workItemChildren = workItemsIdTree[workItemId].map(id => workItemsById[id]);
  const height = svgHeight(rowPathsToRender.length);

  const timeToXCoord = useCallback<ReturnType<typeof xCoordConverterWithin>>((time: string | Date) => {
    const coordsGetter = zoom
      ? xCoordConverterWithin(...zoom)
      : createXCoordConverterFor(workItem, workItemChildren);
    return coordsGetter(time);
  }, [workItem, workItemChildren, zoom]);

  const resetZoom = useCallback(() => setZoom(null), [setZoom]);

  const minDate = zoom ? zoom[0] : getMinDateTime(workItem, workItemChildren);
  const maxDate = zoom ? zoom[1] : getMaxDateTime(workItem, workItemChildren);

  return (
    <div className="relative">
      {zoom ? (
        <button
          className="absolute right-0 -top-7 bg-blue-600 text-white font-medium px-3 py-1 text-sm rounded-t-md"
          onClick={resetZoom}
        >
          Reset zoom
        </button>
      ) : null}
      <svg viewBox={`0 0 ${svgWidth} ${height}`} ref={svgRef} className="select-none">
        <Graticule
          height={height}
          date={new Date(minDate)}
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
        <DragZoom
          svgRef={svgRef}
          svgHeight={height}
          timeToXCoord={timeToXCoord}
          minDate={minDate}
          maxDate={maxDate}
          onSelect={setZoom}
        />
        <VerticalCrosshair
          svgRef={svgRef}
          svgHeight={height}
          minDate={minDate}
          maxDate={maxDate}
        />
      </svg>
    </div>
  );
};

export default WorkItemsGanttChart;
