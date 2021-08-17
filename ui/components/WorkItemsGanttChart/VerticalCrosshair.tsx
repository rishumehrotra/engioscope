import type { MutableRefObject } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import { mediumDate } from '../../helpers/utils';
import {
  axisLabelsHeight, axisLabelsWidth, barStartPadding,
  svgWidth, textWidth, xCoordToDate
} from './helpers';
import useRequestAnimationFrame from '../../hooks/use-request-animation-frame';

const useCrosshair = (
  svgRef: MutableRefObject<SVGSVGElement | null>,
  crosshairRef: MutableRefObject<SVGLineElement | null>,
  dateForCoord: ReturnType<typeof xCoordToDate>
) => {
  const hoverXCoord = useRef<number | null>(null);
  const prevHoverXCoord = useRef<number | null>(null);

  const useSvgEvent = <K extends keyof SVGSVGElementEventMap>(
    eventName: K,
    eventHandler: (this: SVGSVGElement, ev: SVGSVGElementEventMap[K]) => void
  ) => useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener(eventName, eventHandler);
    return () => svg.removeEventListener(eventName, eventHandler);
  }, [eventHandler, eventName]);

  const repositionCrosshair = useCallback(() => {
    if (hoverXCoord.current === prevHoverXCoord.current) return;

    const svg = svgRef.current;
    const crosshair = crosshairRef.current;
    if (!svg || !crosshair) return;

    if (!hoverXCoord.current || hoverXCoord.current < axisLabelsWidth / 2) {
      crosshair.style.display = 'none';
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const crosshairLabel = crosshair.querySelector('div')!;

      crosshair.style.display = '';
      crosshair.style.transform = `translateX(${hoverXCoord.current}px)`;
      const pointerDate = new Date(dateForCoord(hoverXCoord.current));
      crosshairLabel.innerHTML = mediumDate(pointerDate);

      const closeToRightEdge = svgWidth - hoverXCoord.current < axisLabelsWidth / 2;
      if (closeToRightEdge) {
        crosshairLabel.style.transformOrigin = 'right';
        crosshairLabel.style.transform = (
          `translateX(${(svgWidth - hoverXCoord.current - axisLabelsWidth / 2)}px)`
        );
        crosshairLabel.style.textAlign = 'right';
      } else {
        crosshairLabel.style.transform = 'translateX(0)';
        crosshairLabel.style.textAlign = 'center';
        crosshairLabel.style.width = `${axisLabelsWidth}px`;
      }
    }

    prevHoverXCoord.current = hoverXCoord.current;
  }, [crosshairRef, dateForCoord, svgRef]);

  useRequestAnimationFrame(repositionCrosshair);

  const mouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current) {
      hoverXCoord.current = null;
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const mappedPosition = (svgWidth / rect.width) * e.offsetX;
    hoverXCoord.current = mappedPosition < (textWidth + barStartPadding) ? null : mappedPosition;
  }, [svgRef]);
  useSvgEvent('mousemove', mouseMove);

  const mouseLeave = useCallback(() => { hoverXCoord.current = null; }, []);
  useSvgEvent('mouseleave', mouseLeave);

  return crosshairRef;
};

const minMaxSelection = (items: [number, number]) => (
  [Math.min(...items), Math.max(...items)] as [number, number]
);

const showSelection = (
  selection: [number, number],
  selectionRef: SVGRectElement,
  timeToXCoord: (d: Date) => number
) => {
  const [minSelection, maxSelection] = minMaxSelection(selection);
  selectionRef.style.display = '';
  selectionRef.setAttribute(
    'x', timeToXCoord(new Date(minSelection)).toString()
  );
  selectionRef.setAttribute(
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
    const date = dateFromMouseEvent(e);
    selection.current = [date, date];
    isDragging.current = true;
  }, [dateFromMouseEvent, svgRef]);

  const mouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current || !isDragging.current || !selection.current || !selectionRef.current) return;

    svgRef.current.style.cursor = 'ew-resize';
    const date = dateFromMouseEvent(e);
    selection.current = [selection.current[0], date];
    showSelection(selection.current, selectionRef.current, timeToXCoord);
  }, [dateFromMouseEvent, selectionRef, svgRef, timeToXCoord]);

  const mouseUp = useCallback(() => {
    isDragging.current = false;
    if (!svgRef.current || !selection.current || !selectionRef.current) return;

    svgRef.current.style.cursor = 'auto';
    onSelect(minMaxSelection(selection.current));
    selection.current = null;
    selectionRef.current.style.display = 'none';
  }, [onSelect, selectionRef, svgRef]);

  if (!svgRef.current) return null;
  svgRef.current.addEventListener('mousedown', mouseDown);
  svgRef.current.addEventListener('mousemove', mouseMove);
  svgRef.current.addEventListener('mouseup', mouseUp);
};

type VerticalCrossharRef = {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  svgHeight: number;
  minDate: number;
  maxDate: number;
  timeToXCoord: (date: Date) => number;
  onSelect: (selection: [number, number]) => void;
};

const VerticalCrosshair: React.FC<VerticalCrossharRef> = ({
  svgRef, svgHeight, minDate, maxDate, timeToXCoord, onSelect
}) => {
  const crosshairRef = useRef<SVGLineElement | null>(null);
  const selectionRef = useRef<SVGRectElement | null>(null);
  useCrosshair(svgRef, crosshairRef, xCoordToDate(minDate, maxDate));
  useDraggableZoom(
    svgRef, selectionRef, xCoordToDate(minDate, maxDate), timeToXCoord, onSelect
  );

  return (
    <>
      <rect
        ref={selectionRef}
        y="0"
        height={svgHeight - axisLabelsHeight}
        fill="#4495f8"
        fillOpacity="0.4"
        style={{ display: 'none' }}
      />
      <g ref={crosshairRef} style={{ display: 'none' }}>
        <line
          y1={0}
          y2={svgHeight - axisLabelsHeight}
          x1={0}
          x2={0}
          className="pointer-events-none"
          stroke="#999"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        <foreignObject
          x={-1 * (axisLabelsWidth / 2)}
          y={svgHeight - axisLabelsHeight}
          width={axisLabelsWidth}
          height={axisLabelsHeight}
          overflow="visible"
        >
          <div className="text-xs text-gray-500 text-center bg-white">
            date
          </div>
        </foreignObject>
      </g>
    </>
  );
};

export default VerticalCrosshair;
