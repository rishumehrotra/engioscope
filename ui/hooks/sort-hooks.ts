import { useCallback, useEffect } from 'react';
import { StringParam, useQueryParams, withDefault } from 'use-query-params';
import createContextState from '../helpers/create-context-state';

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
  const [sortParams, setSortParams] = useQueryParams({
    sort: withDefault(StringParam, 'desc'),
    sortBy: StringParam
  });

  const toggleSortDirection = useCallback(() => {
    setSortParams({ sort: sortParams.sort === 'asc' ? undefined : 'asc' }, 'replaceIn');
  }, [setSortParams, sortParams.sort]);

  const onSortByChange = useCallback((sortBy: string) => {
    setSortParams({ sortBy: sortBy === sortOptions?.defaultKey ? undefined : sortBy }, 'replaceIn');
  }, [setSortParams, sortOptions?.defaultKey]);

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
