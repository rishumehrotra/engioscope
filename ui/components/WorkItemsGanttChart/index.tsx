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
import VerticalCrosshair from './VerticalCrosshair';
import useGanttRows from './use-gantt-row';

const workItemIdFromRowPath = (rowPath: string) => Number(rowPath.split('/').pop());

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
  const [rows, toggleRow] = useGanttRows(workItemsIdTree, workItemsById, workItemId);

  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const topLevelChildrenIds = useMemo(() => workItemsIdTree[workItemId] || [], [workItemId, workItemsIdTree]);
  const height = useMemo(() => svgHeight(rows.length), [rows.length]);

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
        {rows.map((row, rowIndex, list) => (
          <GanttRow
            key={row.path}
            isLast={rowIndex === list.length}
            row={row}
            rowIndex={rowIndex}
            timeToXCoord={timeToXCoord}
            onToggle={() => toggleRow(row.path)}
            colorForStage={colorForStage}
            revisions={revisions[workItemIdFromRowPath(row.path)] || 'loading'}
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
