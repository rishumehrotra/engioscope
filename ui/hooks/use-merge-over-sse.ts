import { useEffect, useRef, useState } from 'react';

export default <T>(url: string) => {
  const [data, setData] = useState<Partial<T>>({});
  const ref = useRef<EventSource>();

  useEffect(() => {
    if (ref.current) {
      ref.current.close();
      ref.current = undefined;
    }

    if (!ref.current) {
      const sse = new EventSource(url, { withCredentials: true });
      sse.addEventListener('message', e => {
        setData(d => ({ ...d, ...(JSON.parse(e.data) as Partial<T>) }));
      });
      sse.addEventListener('error', () => {
        sse.close();
      });

      ref.current = sse;
    }

    return () => {
      if (ref.current) {
        ref.current.close();
        ref.current = undefined;
      }
    };
  }, [url]);

  return data;
};
