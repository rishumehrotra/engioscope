import React from 'react';
import { useSortOptions, useSortParams } from '../hooks/sort-hooks';
import { Ascending, Descending } from './common/Icons';
import Select from './common/Select';

const SortControls: React.FC = () => {
  const [sortParams, toggleSortDirection, onSortByChange] = useSortParams();
  const sortOptions = useSortOptions();

  if (!sortOptions) return null;

  return (
    <div className="flex items-center">
      <Select
        className="bg-transparent text-gray-900 form-select sm:text-sm font-medium
          focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500 w-32 border rounded border-gray-400 "
        onChange={onSortByChange}
        options={sortOptions.sortKeys.map(l => ({ label: l, value: l }))}
        value={sortParams.sortBy || sortOptions.defaultKey}
      />
      <button
        className="text-base font-medium text-gray-500
          flex justify-end items-center rounded-lg cursor-pointer ml-1 hover:bg-white hover:shadow h-full p-2"
        style={{ outline: 'none' }}
        onClick={toggleSortDirection}
      >
        {sortParams.sort === 'asc' ? <Ascending tooltip="Ascending" /> : <Descending tooltip="Descending" />}
        {/* <p className="mb-1 ml-2 text-sm">Sort By</p> */}
      </button>
    </div>
  );
};

export default SortControls;
