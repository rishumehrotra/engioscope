import { useCallback, useEffect, useRef } from 'react';
import { barStartPadding, svgWidth, textWidth } from './helpers';

export const useMouseEvents = () => {
  const hoverXCoord = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const crosshairRef = useRef<SVGLineElement | null>(null);

  const repositionCrosshair = useCallback(() => {
    // console.log('here');
    const svg = svgRef.current;
    const crosshair = crosshairRef.current;
    if (!svg || !crosshair) { return; }
    crosshair.style.transform = `translateX(${hoverXCoord.current || 0}px)`;
    rafRef.current = requestAnimationFrame(repositionCrosshair);
  }, []);

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
  }, []);

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) return;
    svg.addEventListener('mousemove', mouseMove);
    return () => svg.removeEventListener('mousemove', mouseMove);
  }, [mouseMove]);

  const mouseLeave = useCallback(() => {
    hoverXCoord.current = null;
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('mouseleave', mouseLeave);
    return () => svg.removeEventListener('mouseleave', mouseLeave);
  }, [mouseLeave]);

  return [svgRef, crosshairRef] as const;
};
