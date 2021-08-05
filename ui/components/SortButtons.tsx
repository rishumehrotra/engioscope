import React from 'react';
import createUrlParamsHookFromUnion from '../hooks/create-url-params-hook-from-union';
import { useSortOrder } from '../hooks/query-params-hooks';
import { Ascending, Descending } from './Icons';
import Select from './Select';

type SortButtonsProps<T extends string> = {
  sort: 'asc' | 'desc';
  setSort: (x: 'asc' | 'desc') => void;
  sortBy: T;
  setSortBy: (x: T) => void;
  labels: Readonly<T[]>;
}

const SortButtons = <T extends string>({
  sort, setSort, setSortBy, sortBy, labels
}: SortButtonsProps<T>) => (
  <div className="flex items-center justify-end justify-items-end">
    <button
      className="text-base font-medium text-gray-600
      flex justify-end rounded-lg cursor-pointer"
      style={{ outline: 'none' }}
      onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}
    >
      {sort === 'asc' ? <Ascending /> : <Descending />}
      <p className="mb-1 ml-2 text-sm">Sort By</p>
    </button>
    <Select
      className="bg-transparent text-gray-900 rounded-lg border-0
      form-select p-0 pl-2 h-9 sm:text-sm font-medium
      focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500"
      onChange={x => setSortBy(x as T)}
      options={labels.map(l => ({ label: l, value: l }))}
      value={sortBy}
    />
  </div>
);

type SortControlsProps<T extends string> = {
  options: Readonly<T[]>;
  defaultSortBy: T;
}

const SortControls = <T extends string>({ options, defaultSortBy }: SortControlsProps<T>) => {
  const useSortByQueryParam = createUrlParamsHookFromUnion(options, defaultSortBy);
  const [sort, setSort] = useSortOrder();
  const [sortBy, setSortBy] = useSortByQueryParam();

  return (
    <SortButtons
      sort={sort}
      setSort={setSort}
      setSortBy={setSortBy}
      sortBy={sortBy}
      labels={options}
    />
  );
};

export default SortControls;
