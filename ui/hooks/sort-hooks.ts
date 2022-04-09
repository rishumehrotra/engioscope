import { useCallback, useEffect, useMemo } from 'react';
import createContextState from '../helpers/create-context-state';
import useQueryParam, { asString } from './use-query-param';

type SortContext = {
  sortKeys: string[];
  defaultKey: string;
} | null;

const [
  SortContextProvider,
  useSortOptions,
  useSetSortOptions
] = createContextState<SortContext>(null);

export { SortContextProvider, useSortOptions };

export const useSortParams = () => {
  const sortOptions = useSortOptions();
  const [sort, setSort] = useQueryParam('sort', asString);
  const [sortBy, setSortBy] = useQueryParam('sortBy', asString);

  const sortParams = useMemo(() => ({
    sort: sort === undefined ? 'desc' : 'asc',
    sortBy
  }), [sort, sortBy]);

  const toggleSortDirection = useCallback(() => {
    setSort(sort === 'asc' ? undefined : 'asc', true);
  }, [setSort, sort]);

  const onSortByChange = useCallback((sortBy: string) => {
    setSortBy(sortBy === sortOptions?.defaultKey ? undefined : sortBy, true);
  }, [setSortBy, sortOptions?.defaultKey]);

  return [sortParams, toggleSortDirection, onSortByChange] as const;
};

type SortFunction<T> = (a: T, b: T) => number;
export type SortMap<T> = Record<string, SortFunction<T>>;

export const useSort = <T>(sortMap: SortMap<T>, defaultKey: string) => {
  if (sortMap && !Object.keys(sortMap).includes(defaultKey)) {
    throw new Error(`Default sort key ${defaultKey} not found in sort map`);
  }

  const setSortOptions = useSetSortOptions();
  const [sortParams] = useSortParams();

  useEffect(() => (
    setSortOptions({ sortKeys: Object.keys(sortMap), defaultKey })
  ), [defaultKey, setSortOptions, sortMap]);

  return useCallback(
    (a: T, b: T) => {
      const sortDirection = sortParams.sort === 'asc' ? 1 : -1;
      const sortFunction = sortMap[sortParams.sortBy || defaultKey];
      return sortDirection * sortFunction(a, b);
    },
    [defaultKey, sortMap, sortParams.sort, sortParams.sortBy]
  );
};

export const useRemoveSort = () => {
  const setSortOptions = useSetSortOptions();
  useEffect(() => setSortOptions(null));
};
