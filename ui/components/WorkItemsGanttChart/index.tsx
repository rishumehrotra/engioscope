import React, {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react';
import type { AnalysedWorkItems, UIWorkItemRevision } from '../../../shared/types';
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
    if (state === 'no-children') return { rowPaths: renderedRowPaths, childIds: [] };
    if (state === 'expanded') {
      return {
        rowPaths: renderedRowPaths.filter(r => !r.startsWith(`${rowPath}/`)),
        childIds: []
      };
    }
    return {
      rowPaths: [
        ...renderedRowPaths.slice(0, renderedRowPaths.indexOf(rowPath) + 1),
        ...workItemsIdTree[workItemIdFromRowPath(rowPath)].map(id => `${rowPath}/${id}`),
        ...renderedRowPaths.slice(renderedRowPaths.indexOf(rowPath) + 1)
      ],
      childIds: workItemsIdTree[workItemIdFromRowPath(rowPath)]
    };
  }
);

export type WorkItemsGanttChartProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  colorForStage: (stage: string) => string;
  revisions: Record<string, 'loading' | UIWorkItemRevision[]>;
  getRevisions: (workItemIds: number[]) => void;
};

const WorkItemsGanttChart: React.FC<WorkItemsGanttChartProps> = ({
  workItemId, workItemsById, workItemsIdTree, colorForStage,
  revisions, getRevisions
}) => {
  const [rowPathsToRender, setRowPathsToRender] = useState(workItemsIdTree[workItemId].map(String));
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const topLevelChildrenIds = workItemsIdTree[workItemId];
  const height = svgHeight(rowPathsToRender.length);

  const topLevelRevisions = useMemo(() => {
    if (topLevelChildrenIds.some(id => !revisions[id] || revisions[id] === 'loading')) return 'loading';
    return topLevelChildrenIds.flatMap(id => {
      const rev = revisions[id];
      return rev === 'loading' ? [] : rev;
    });
  }, [revisions, topLevelChildrenIds]);

  useEffect(() => {
    getRevisions(topLevelChildrenIds);
  }, [getRevisions, topLevelChildrenIds]);

  const timeToXCoord = useCallback<ReturnType<typeof xCoordConverterWithin>>((time: string | Date) => {
    // eslint-disable-next-line no-nested-ternary
    const coordsGetter = zoom
      ? xCoordConverterWithin(...zoom)
      : topLevelRevisions === 'loading'
        ? () => 0
        : createXCoordConverterFor(topLevelRevisions);
    return coordsGetter(time);
  }, [topLevelRevisions, zoom]);

  const resetZoom = useCallback(() => setZoom(null), [setZoom]);

  console.log('Hello', workItemId);

  // eslint-disable-next-line no-nested-ternary
  const minDate = zoom ? zoom[0] : topLevelRevisions === 'loading' ? 0 : getMinDateTime(topLevelRevisions);
  // eslint-disable-next-line no-nested-ternary
  const maxDate = zoom ? zoom[1] : topLevelRevisions === 'loading' ? 0 : getMaxDateTime(topLevelRevisions);

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
              const { rowPaths, childIds } = toggleExpandState(rowPath, workItemsIdTree)(rowPathsToRender);
              setRowPathsToRender(rowPaths);
              getRevisions(childIds);
            }}
            expandedState={expandedState(rowPath, rowPathsToRender, workItemsIdTree)}
            colorForStage={colorForStage}
            revisions={revisions[workItemIdFromRowPath(rowPath)] || 'loading'}
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
