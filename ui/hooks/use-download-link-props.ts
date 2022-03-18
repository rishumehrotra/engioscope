import type React from 'react';
import { useEffect, useRef } from 'react';

export default (data: string, type: string, fileName: string): React.HTMLProps<HTMLAnchorElement> => {
  const ref = useRef<string | null>(null);

  useEffect(() => {
    const path = URL.createObjectURL(new Blob([data], { type }));
    ref.current = path;

    return () => {
      if (ref.current !== null) URL.revokeObjectURL(ref.current);
    };
  }, [data, type]);

  return {
    download: fileName,
    href: ref.current || ''
  };
};
