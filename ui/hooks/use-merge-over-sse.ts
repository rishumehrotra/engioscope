import { useEffect, useRef, useState } from 'react';

const makeTerminatingSSECall = (
  url: string,
  handleChunk: (e: MessageEvent) => void,
  onComplete?: () => void,
  terminator = 'done'
) => {
  const sse = new EventSource(url, { withCredentials: true });
  sse.addEventListener('message', e => {
    if (e.data === terminator) {
      sse.close();
      onComplete?.();
    } else {
      handleChunk(e);
    }
  });
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
      ref.current = makeTerminatingSSECall(url, e => {
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
