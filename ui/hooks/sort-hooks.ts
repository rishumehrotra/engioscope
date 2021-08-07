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

export { SortContextProvider, useSortOptions, useSetSortOptions };

export const useSortParams = () => useQueryParams({
  sort: withDefault(StringParam, 'desc'),
  sortBy: StringParam
});
