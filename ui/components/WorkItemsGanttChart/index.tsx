import React, {
  memo,
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

const removeAncestors = (rowPath: string, parentWorkItemId: number, children: number[]) => {
  const ancestors = [parentWorkItemId, ...rowPath.split('/').map(Number)];
  return children.filter(child => !ancestors.includes(child));
};

const expandedState = (
  rowPath: string,
  renderedRowPaths: string[],
  parentWorkItemId: number,
  workItemsIdTree: Record<number, number[]>
): ExpandedState => {
  const workItemId = workItemIdFromRowPath(rowPath);
  if (!workItemsIdTree[workItemId] || !removeAncestors(rowPath, parentWorkItemId, workItemsIdTree[workItemId]).length) return 'no-children';
  return renderedRowPaths.filter(r => r.startsWith(rowPath)).length === 1
    ? 'collapsed'
    : 'expanded';
};

const toggleExpandState = (
  rowPath: string, workItemsIdTree: Record<number, number[]>,
  parentWorkItemId: number, renderedRowPaths: string[]
) => {
  const state = expandedState(rowPath, renderedRowPaths, parentWorkItemId, workItemsIdTree);
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
      ...removeAncestors(
        rowPath,
        parentWorkItemId,
        workItemsIdTree[workItemIdFromRowPath(rowPath)]
      ).map(id => `${rowPath}/${id}`),
      ...renderedRowPaths.slice(renderedRowPaths.indexOf(rowPath) + 1)
    ],
    childIds: workItemsIdTree[workItemIdFromRowPath(rowPath)]
  };
};

export type WorkItemsGanttChartProps = {
  workItemId: number;
  workItemsById: AnalysedWorkItems['byId'];
  workItemsIdTree: AnalysedWorkItems['ids'];
  colorForStage: (stage: string) => string;
  revisions: Record<string, 'loading' | UIWorkItemRevision[]>;
  getRevisions: (workItemIds: number[]) => void;
};

const WorkItemsGanttChart: React.FC<WorkItemsGanttChartProps> = memo(({
  workItemId, workItemsById, workItemsIdTree, colorForStage,
  revisions, getRevisions
}) => {
  const [rowPathsToRender, setRowPathsToRender] = useState(workItemsIdTree[workItemId].map(String));
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const topLevelChildrenIds = useMemo(() => workItemsIdTree[workItemId], [workItemId, workItemsIdTree]);
  const height = useMemo(() => svgHeight(rowPathsToRender.length), [rowPathsToRender.length]);

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

  const minDate = useMemo(() => {
    if (zoom) return zoom[0];
    if (topLevelRevisions === 'loading') return 0;
    return getMinDateTime(topLevelRevisions);
  }, [zoom, topLevelRevisions]);

  const maxDate = useMemo(() => {
    if (zoom) return zoom[1];
    if (topLevelRevisions === 'loading') return 0;
    return getMaxDateTime(topLevelRevisions);
  }, [zoom, topLevelRevisions]);

  const onToggle = useCallback((rowPath: string) => {
    const { rowPaths, childIds } = toggleExpandState(rowPath, workItemsIdTree, workItemId, rowPathsToRender);
    setRowPathsToRender(rowPaths);
    getRevisions(childIds);
  }, [getRevisions, rowPathsToRender, workItemId, workItemsIdTree]);

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
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        ref={svgRef}
        className="select-none"
        style={{ contain: 'content' }}
      >
        <Graticule
          height={height}
          date={new Date(minDate)}
        />
        {rowPathsToRender.map((rowPath, rowIndex, list) => (
          <GanttRow
            key={rowPath}
            isLast={rowIndex === list.length}
            workItem={workItemsById[workItemIdFromRowPath(rowPath)]}
            indentation={indentation(rowPath)}
            rowIndex={rowIndex}
            timeToXCoord={timeToXCoord}
            onToggle={onToggle}
            rowPath={rowPath}
            expandedState={expandedState(rowPath, rowPathsToRender, workItemId, workItemsIdTree)}
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
});

export default WorkItemsGanttChart;
