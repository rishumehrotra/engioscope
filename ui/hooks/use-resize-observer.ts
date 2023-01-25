import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

export type OnResize = <T extends HTMLElement>(
  entries: ResizeObserverEntry[],
  observer: ResizeObserver,
  ref: MutableRefObject<T | null>
) => void;

export default <T extends HTMLElement>() => {
  const resizeObserver = useRef<ResizeObserver | null>();
  const ref = useRef<T>(null);

  const setResizeObserver = useCallback((fn: OnResize) => {
    if (resizeObserver.current) resizeObserver.current.disconnect();
    resizeObserver.current = new ResizeObserver((...args) => fn(...args, ref));
    // if (ref.current) resizeObserver.current.observe(ref.current);
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    const ro = resizeObserver.current;
    if (!ro) return;
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, setResizeObserver] as const;
};
