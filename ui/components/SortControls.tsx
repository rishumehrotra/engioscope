import React from 'react';
import { useSortOptions, useSortParams } from '../hooks/sort-hooks';
import { Ascending, Descending } from './common/Icons';
import Select from './common/Select';

const SortControls: React.FC = () => {
  const [sortParams, toggleSortDirection, onSortByChange] = useSortParams();
  const sortOptions = useSortOptions();

  if (!sortOptions) return null;

  return (
    <div className="flex items-center justify-end justify-items-end">
      <button
        className="text-base font-medium text-gray-600
          flex justify-end rounded-lg cursor-pointer"
        style={{ outline: 'none' }}
        onClick={toggleSortDirection}
      >
        {sortParams.sort === 'asc' ? <Ascending /> : <Descending />}
        <p className="mb-1 ml-2 text-sm">Sort By</p>
      </button>
      <Select
        className="bg-transparent text-gray-900 rounded-lg border-0
          form-select p-0 pl-2 h-9 sm:text-sm font-medium
          focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500"
        onChange={onSortByChange}
        options={sortOptions.sortKeys.map(l => ({ label: l, value: l }))}
        value={sortParams.sortBy || sortOptions.defaultKey}
      />
    </div>
  );
};

export default SortControls;
