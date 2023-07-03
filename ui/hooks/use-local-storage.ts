import { useMemo } from 'react';
import type { z } from 'zod';

const useLocalStorage = <T>(key: string, schema: z.Schema<T>) => {
  const setLocalStorage = (value: T | null) => {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  const valueFromStorage = useMemo(() => {
    const rawValue = localStorage.getItem(key);
    return schema.parse(rawValue === null ? undefined : JSON.parse(rawValue));
  }, [key, schema]);

  return [valueFromStorage, setLocalStorage] as const;
};

export default useLocalStorage;
