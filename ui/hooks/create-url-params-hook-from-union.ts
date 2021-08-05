import { useQueryParam, QueryParamConfig } from 'use-query-params';

export default <T extends string>(options: Readonly<T[]>, defaultSortBy: T) => {
  type SortByOptions = (typeof options)[number];

  const SortByParam: QueryParamConfig<SortByOptions> = {
    encode: x => x,
    decode: x => ((x && options.includes(x as SortByOptions)) ? x as SortByOptions : defaultSortBy)
  };

  return () => useQueryParam('sortBy', SortByParam);
};
