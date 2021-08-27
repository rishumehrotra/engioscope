import { useCallback, useState } from 'react';

const TOP = 20;
const BOTTOM = 10;

export const topItems = <T>(page: number, items: T[]) => {
  const maxNumberOfPages = items.length - (TOP * page) - BOTTOM;
  if (page >= maxNumberOfPages) return items;
  return [...items.slice(0, page * TOP)];
};

export const bottomItems = <T>(items: T[]) => [...items.slice(items.length - BOTTOM)];

const usePagination = () => {
  const [page, setPage] = useState<number>(1);
  const loadMore = useCallback(() => setPage(Number(page || 1) + 1), [page]);

  return [page, loadMore] as const;
};

export default usePagination;

