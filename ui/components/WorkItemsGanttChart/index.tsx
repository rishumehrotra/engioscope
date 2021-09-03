import React, {
  memo,
  useCallback, useMemo, useRef, useState
} from 'react';
import type { AnalysedWorkItems, UIWorkItemRevision } from '../../../shared/types';
import DragZoom from './DragZoom';
import { GanttRow } from './GanttRow';
import { Graticule } from './Graticule';
import {
  svgWidth, svgHeight, xCoordConverterWithin, bottomScaleHeight
} from './helpers';
import VerticalCrosshair from './VerticalCrosshair';
import useGanttRows, { isProjectRow } from './use-gantt-rows';
import BottomScale from './BottomScale';

const showBottomScale = false;
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
  const height = useMemo(() => svgHeight(rows.length), [rows.length]);

  const timeToXCoord = useCallback<ReturnType<typeof xCoordConverterWithin>>((time: string | Date) => {
    const coordsGetter = zoom
      ? xCoordConverterWithin(...zoom)
      : xCoordConverterWithin(
        rows.filter(isProjectRow)[1].minTimestamp,
        rows.filter(isProjectRow)[1].maxTimestamp
      );
    return coordsGetter(time);
  }, [rows, zoom]);

  const resetZoom = useCallback(() => setZoom(null), [setZoom]);

  const minDate = useMemo(() => {
    if (zoom) return zoom[0];
    if (!rows.length) return 0;
    return rows.filter(isProjectRow)[1].minTimestamp;
  }, [zoom, rows]);

  const maxDate = useMemo(() => {
    if (zoom) return zoom[1];
    if (!rows.length) return 0;
    return rows.filter(isProjectRow)[1].maxTimestamp;
  }, [zoom, rows]);

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
        viewBox={`0 0 ${svgWidth} ${height + (showBottomScale ? bottomScaleHeight : 0)}`}
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
            onToggle={() => {
              toggleRow(row.path);
              if (!(row.type === 'workitem-environment' || row.type === 'workitem-type')) return;
              getRevisions(row.workItemIds);
            }}
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
        {rows.length && showBottomScale ? (
          <BottomScale
            count={rows.length}
            lowerDate={new Date(minDate)}
            upperDate={new Date(maxDate)}
            initialMinDate={new Date(rows.filter(isProjectRow)[1].minTimestamp)}
            initialMaxDate={new Date(rows.filter(isProjectRow)[1].maxTimestamp)}
            onSelect={setZoom}
          />
        ) : null}
      </svg>
    </div>
  );
});

export default WorkItemsGanttChart;
