import React, { useCallback, useEffect, useRef } from 'react';
import { mediumDate } from '../../helpers/utils';
import type { xCoordConverterWithin } from './helpers';
import {
  xCoordToDate,
  axisLabelsHeight,
  axisLabelsWidth,
  barStartPadding, bottomScaleHeight, rowPadding, svgWidth, textHeight, textWidth
} from './helpers';

type DragHandleProps = {
  onSelect: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  x: number;
  y: number;
  lowerDate: Date;
  upperDate: Date;
  timeToXCoord: ReturnType<typeof xCoordConverterWithin>;
  initialMinDate: Date;
  initialMaxDate: Date;
};

const DragHandle: React.FC<DragHandleProps> = ({
  onSelect, x, y, lowerDate, upperDate, timeToXCoord, initialMinDate, initialMaxDate
}) => {
  const dragHandleRef = useRef<SVGSVGElement | null>(null);
  const isDragging = useRef<boolean>(false);

  const dateFromMouseEvent = useCallback((e: MouseEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rect = dragHandleRef.current!.getBoundingClientRect();

    return xCoordToDate(initialMinDate.getTime(), initialMaxDate.getTime())((svgWidth / rect.width) * e.offsetX);
  }, [initialMaxDate, initialMinDate]);

  const onDrag = useCallback(e => {
    if (!dragHandleRef.current || !isDragging.current) return;
    dragHandleRef.current.style.cursor = 'grab';
    const date = dateFromMouseEvent(e);
    const dragXCoord = timeToXCoord(new Date(date));

    onSelect([dragXCoord, timeToXCoord(upperDate)]);
  }, [dateFromMouseEvent, onSelect, timeToXCoord, upperDate]);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  const mouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const mouseMove = useCallback(e => {
    if (!isDragging.current) return;
    requestAnimationFrame(() => onDrag(e));
  }, [onDrag]);

  const mouseUp = useCallback(() => {
    stopDrag();
  }, [stopDrag]);

  useEffect(() => {
    if (!dragHandleRef.current) return;

    const svg = dragHandleRef.current;
    svg.addEventListener('mousedown', mouseDown);
    svg.addEventListener('mousemove', mouseMove);
    svg.addEventListener('mouseup', mouseUp);
    return () => {
      svg.removeEventListener('mousedown', mouseDown);
      svg.removeEventListener('mousemove', mouseMove);
      svg.removeEventListener('mouseup', mouseUp);
    };
  }, [mouseDown, mouseMove, dragHandleRef, mouseUp]);

  return (
    <svg
      ref={dragHandleRef}
      x={x + timeToXCoord(lowerDate)}
      y={y}
      width="48"
      height={axisLabelsHeight}
      onMouseOut={stopDrag}
    >
      {/* eslint-disable-next-line max-len */}
      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
};

type DateLabelProps = {
  x: number;
  date: Date;
  count: number; // to calculate y
};

const DateLabel: React.FC<DateLabelProps> = ({ count, date, x }) => (
  <foreignObject
    x={x}
    y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight}
    width={axisLabelsWidth}
    height={axisLabelsHeight}
  >
    <div className="text-xs text-gray-500 text-center pt-2">
      {mediumDate(date)}
    </div>
  </foreignObject>
);

type BottomScaleProps = {
  count: number;
  lowerDate: Date;
  upperDate: Date;
  initialMinDate: Date;
  initialMaxDate: Date;
  onSelect: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  timeToXCoord: ReturnType<typeof xCoordConverterWithin>;
};

const BottomScale: React.FC<BottomScaleProps> = ({
  count, lowerDate, upperDate, onSelect, initialMinDate, initialMaxDate, timeToXCoord
}) => (
  <g>
    <line
      x1={textWidth + barStartPadding}
      y1={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight}
      x2={svgWidth}
      y2={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight}
      stroke="#ccc"
      strokeWidth="1"
    />
    <DateLabel count={count} x={textWidth + barStartPadding - 30} date={initialMinDate} />
    <DragHandle
      timeToXCoord={timeToXCoord}
      x={textWidth + barStartPadding - 8}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight - 25}
      onSelect={onSelect}
      lowerDate={lowerDate}
      upperDate={upperDate}
      initialMinDate={initialMinDate}
      initialMaxDate={initialMaxDate}
    />
    <DateLabel count={count} x={svgWidth - 75} date={initialMaxDate} />
    <DragHandle
      timeToXCoord={timeToXCoord}
      x={svgWidth - 18}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight - 25}
      onSelect={onSelect}
      lowerDate={lowerDate}
      upperDate={upperDate}
      initialMinDate={initialMinDate}
      initialMaxDate={initialMaxDate}
    />
  </g>
);

export default BottomScale;

