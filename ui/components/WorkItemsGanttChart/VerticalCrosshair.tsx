import type { MutableRefObject } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import { mediumDate } from '../../helpers/utils';
import {
  axisLabelsHeight, axisLabelsWidth, barStartPadding,
  svgWidth, textWidth, xCoordToDate
} from './helpers';

const useMouseEvents = (
  svgRef: MutableRefObject<SVGSVGElement | null>,
  dateForCoord: ReturnType<typeof xCoordToDate>
) => {
  const hoverXCoord = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const crosshairRef = useRef<SVGLineElement | null>(null);

  const repositionCrosshair = useCallback(() => {
    const svg = svgRef.current;
    const crosshair = crosshairRef.current;
    if (!svg || !crosshair) return;

    if (!hoverXCoord.current || hoverXCoord.current < 40) {
      crosshair.style.display = 'none';
    } else {
      crosshair.style.display = '';
      crosshair.style.transform = `translateX(${hoverXCoord.current}px)`;
      const pointerDate = new Date(dateForCoord(hoverXCoord.current));
      crosshair.querySelector('div')!.innerHTML = mediumDate(pointerDate);
    }
    rafRef.current = requestAnimationFrame(repositionCrosshair);
  }, [dateForCoord, svgRef]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(repositionCrosshair);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return () => cancelAnimationFrame(rafRef.current!);
  }, [repositionCrosshair]);

  const mouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current) {
      hoverXCoord.current = null;
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const mappedPosition = (svgWidth / rect.width) * e.offsetX;
    hoverXCoord.current = mappedPosition < (textWidth + barStartPadding) ? null : mappedPosition;
  }, [svgRef]);

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) return;
    svg.addEventListener('mousemove', mouseMove);
    return () => svg.removeEventListener('mousemove', mouseMove);
  }, [mouseMove, svgRef]);

  const mouseLeave = useCallback(() => { hoverXCoord.current = null; }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener('mouseleave', mouseLeave);
    return () => svg.removeEventListener('mouseleave', mouseLeave);
  }, [mouseLeave, svgRef]);

  return crosshairRef;
};

type VerticalCrossharRef = {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  svgHeight: number;
  minDate: number;
  maxDate: number;
};

const VerticalCrosshair: React.FC<VerticalCrossharRef> = ({
  svgRef, svgHeight, minDate, maxDate
}) => {
  const crosshairRef = useMouseEvents(svgRef, xCoordToDate(minDate, maxDate));

  return (
    <g ref={crosshairRef}>
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
      >
        <div className="text-xs text-gray-500 text-center">
          date
        </div>
      </foreignObject>
    </g>
  );
};

export default VerticalCrosshair;
