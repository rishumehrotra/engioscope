import type { MutableRefObject } from 'react';
import React, { useEffect, useCallback, useRef } from 'react';
import {
  axisLabelsHeight, barStartPadding, svgWidth, textWidth, xCoordToDate
} from './helpers';

const minMaxSelection = (items: [number, number]) => (
  [Math.min(...items), Math.max(...items)] as [number, number]
);

const showSelection = (
  selection: [number, number],
  selectionRect: SVGRectElement,
  timeToXCoord: (d: Date) => number
) => {
  const [minSelection, maxSelection] = minMaxSelection(selection);
  selectionRect.style.display = '';
  selectionRect.setAttribute(
    'x', timeToXCoord(new Date(minSelection)).toString()
  );
  selectionRect.setAttribute(
    'width', (
      timeToXCoord(new Date(maxSelection)) - timeToXCoord(new Date(minSelection))
    ).toString()
  );
};

const useDraggableZoom = (
  svgRef: MutableRefObject<SVGSVGElement | null>,
  selectionRef: MutableRefObject<SVGRectElement | null>,
  dateForCoord: ReturnType<typeof xCoordToDate>,
  timeToXCoord: (d: Date) => number,
  onSelect: (selection: [number, number]) => void
) => {
  const selection = useRef<[number, number] | null>(null);
  const isDragging = useRef<boolean>(false);

  const dateFromMouseEvent = useCallback((e: MouseEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rect = svgRef.current!.getBoundingClientRect();
    return dateForCoord((svgWidth / rect.width) * e.offsetX);
  }, [dateForCoord, svgRef]);

  const mouseDown = useCallback((e: MouseEvent) => {
    if (!svgRef.current) return;
    if (e.offsetX < textWidth + barStartPadding) return;

    const date = dateFromMouseEvent(e);
    selection.current = [date, /* This second value is dummy */ date];
    isDragging.current = true;
  }, [dateFromMouseEvent, svgRef]);

  const mouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current || !isDragging.current || !selection.current || !selectionRef.current) return;

    svgRef.current.style.cursor = 'ew-resize';
    selection.current = [selection.current[0], dateFromMouseEvent(e)];
    showSelection(selection.current, selectionRef.current, timeToXCoord);
  }, [dateFromMouseEvent, selectionRef, svgRef, timeToXCoord]);

  const mouseUp = useCallback(() => {
    isDragging.current = false;
    if (!svgRef.current || !selection.current || !selectionRef.current) return;

    svgRef.current.style.cursor = 'auto';
    const selectionMinMax = minMaxSelection(selection.current);
    const selectionWidth = selectionMinMax[1] - selectionMinMax[0];
    if (selectionWidth !== 0) onSelect(selectionMinMax);
    selection.current = null;
    selectionRef.current.style.display = 'none';
  }, [onSelect, selectionRef, svgRef]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    svg.addEventListener('mousedown', mouseDown);
    svg.addEventListener('mousemove', mouseMove);
    svg.addEventListener('mouseup', mouseUp);

    return () => {
      svg.removeEventListener('mousedown', mouseDown);
      svg.removeEventListener('mousemove', mouseMove);
      svg.removeEventListener('mouseup', mouseUp);
    };
  }, [mouseDown, mouseMove, mouseUp, svgRef]);
};

type DragZoomProps = {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  svgHeight: number;
  minDate: number;
  maxDate: number;
  timeToXCoord: (date: Date) => number;
  onSelect: (selection: [number, number]) => void;
};

const DragZoom: React.FC<DragZoomProps> = ({
  svgRef, svgHeight, minDate, maxDate, timeToXCoord, onSelect
}) => {
  const selectionRef = useRef<SVGRectElement | null>(null);
  useDraggableZoom(
    svgRef, selectionRef, xCoordToDate(minDate, maxDate), timeToXCoord, onSelect
  );

  return (
    <rect
      ref={selectionRef}
      y="0"
      height={svgHeight - axisLabelsHeight}
      fill="#4495f8"
      fillOpacity="0.4"
      style={{ display: 'none' }}
      className="pointer-events-none"
    />
  );
};

export default DragZoom;
