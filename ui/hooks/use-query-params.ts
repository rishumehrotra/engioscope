import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export default () => {
  const { search } = useLocation();
  const queryParams = useMemo(() => {
    const params = new URLSearchParams(search);

    return Array.from(params.entries()).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }, [search]);

  return queryParams;
};
