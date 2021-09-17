import React, {
  useCallback, useEffect, useRef
} from 'react';
import { mediumDate } from '../../helpers/utils';
import {
  xCoordConverterWithin,
  axisLabelsHeight,
  axisLabelsWidth,
  bottomScaleHeight,
  svgWidth,
  xCoordToDate
} from './helpers';

type DragHandleProps = {
  onSelect: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  y: number;
  lowerDate: Date;
  timeToXCoord: ReturnType<typeof xCoordConverterWithin>;
  initialMinDate: Date;
  initialMaxDate: Date;
  zoom: [number, number] | null;
};

const dragHandleWidth = 48;

const DragHandle: React.FC<DragHandleProps> = ({
  onSelect, y, lowerDate, timeToXCoord, initialMinDate, initialMaxDate, zoom
}) => {
  const dragHandleRef = useRef<SVGSVGElement | null>(null);
  const isDragging = useRef<boolean>(false);

  const onDrag = useCallback(e => {
    if (!dragHandleRef.current || !isDragging.current) return;
    dragHandleRef.current.style.cursor = 'grab';
    const dragXCoord = e.offsetX;
    onSelect([xCoordToDate(lowerDate.getTime(), initialMaxDate.getTime())(dragXCoord), initialMaxDate.getTime()]);
  }, [initialMaxDate, lowerDate, onSelect]);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  const mouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const mouseMove = useCallback(e => {
    if (!isDragging.current) return;
    onDrag(e);
    // requestAnimationFrame(() => onDrag(e));
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

  const xCoordFromZoom = zoom ? zoom[0] : timeToXCoord(initialMinDate);

  return (
    <svg
      ref={dragHandleRef}
      x={xCoordFromZoom}
      y={y}
      width={dragHandleWidth}
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
  y: number;
  date: Date;
};

const DateLabel: React.FC<DateLabelProps> = ({
  date, x, y
}) => (
  <foreignObject
    x={x}
    y={y + bottomScaleHeight}
    width={axisLabelsWidth}
    height={axisLabelsHeight}
  >
    <div className="text-xs text-gray-500 text-center pt-2">
      {mediumDate(date)}
    </div>
  </foreignObject>
);

type BottomScaleProps = {
  x: number;
  y: number;
  lowerDate: Date;
  initialMinDate: Date;
  initialMaxDate: Date;
  onSelect: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  zoom: [number, number] | null;
};

const BottomScale: React.FC<BottomScaleProps> = ({
  x, y, lowerDate, onSelect, initialMinDate, initialMaxDate, zoom
}) => {
  const timeToXCoord = useCallback<ReturnType<typeof xCoordConverterWithin>>((time: string | Date) => {
    const coordsGetter = xCoordConverterWithin(
      initialMinDate.getTime(),
      initialMaxDate.getTime()
    );
    return coordsGetter(time);
  }, [initialMaxDate, initialMinDate]);

  return (
    <g>
      <line
        x1={x}
        y1={y + bottomScaleHeight}
        x2={svgWidth}
        y2={y + bottomScaleHeight}
        stroke="#ccc"
        strokeWidth="1"
      />
      <DateLabel
        x={x - 30}
        y={y}
        date={initialMinDate}
      />
      <DragHandle
        timeToXCoord={timeToXCoord}
        y={y + bottomScaleHeight - 25}
        zoom={zoom}
        onSelect={onSelect}
        lowerDate={lowerDate}
        initialMinDate={initialMinDate}
        initialMaxDate={initialMaxDate}
      />
      <DateLabel
        x={svgWidth - axisLabelsWidth}
        y={y}
        date={initialMaxDate}
      />
    </g>
  );
};

export default BottomScale;

