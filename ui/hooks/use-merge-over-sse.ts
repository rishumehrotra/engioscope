import { useEffect, useRef, useState } from 'react';

const makeSSECall = (url: string, handleChunk: (e: MessageEvent) => void) => {
  const sse = new EventSource(url, { withCredentials: true });
  sse.addEventListener('message', handleChunk);
  sse.addEventListener('error', sse.close);
  return sse;
};

export default <T>(url: string, key: string) => {
  const [data, setData] = useState<Partial<T>>({});
  const ref = useRef<EventSource>();

  useEffect(() => {
    if (ref.current) {
      ref.current.close();
      ref.current = undefined;
    }

    if (!ref.current) {
      ref.current = makeSSECall(url, e => {
        setData(d => ({ ...d, ...(JSON.parse(e.data) as Partial<T>) }));
      });
    }

    return () => {
      if (ref.current) {
        ref.current.close();
        ref.current = undefined;
      }
    };
  }, [url, key]);

  return data;
};
