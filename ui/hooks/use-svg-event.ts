import type { MutableRefObject } from 'react';
import { useEffect } from 'react';

const useSvgEvent = <K extends keyof SVGSVGElementEventMap>(
  svgRef: MutableRefObject<SVGSVGElement | null>,
  eventName: K,
  eventHandler: (this: SVGSVGElement, ev: SVGSVGElementEventMap[K]) => void
) => useEffect(() => {
  const svg = svgRef.current;
  if (!svg) return;

  svg.addEventListener(eventName, eventHandler);
  return () => svg.removeEventListener(eventName, eventHandler);
}, [eventHandler, eventName, svgRef]);

export default useSvgEvent;
