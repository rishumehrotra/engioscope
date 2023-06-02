import React, { useCallback, useMemo } from 'react';
import { Ascending, Descending } from './common/Icons.jsx';
import Select from './common/Select.jsx';
import useQueryParam, { asString } from '../hooks/use-query-param.js';

type SortControlsProps = {
  sortByList: string[];
  defaultSortBy?: string;
  defaultSortDirection?: 'asc' | 'desc';
};

const SortControls: React.FC<SortControlsProps> = ({
  sortByList,
  defaultSortBy = sortByList[0],
  defaultSortDirection = 'desc',
}) => {
  const [sortDirection, setSortDirection] = useQueryParam('sort', asString);
  const [sortBy, setSortBy] = useQueryParam('sortBy', asString);

  const currentSortDirection = useMemo(
    () => sortDirection || defaultSortDirection,
    [defaultSortDirection, sortDirection]
  );

  const onSortByChange = useCallback(
    (newSortBy: string) => {
      return setSortBy(newSortBy === defaultSortBy ? undefined : newSortBy);
    },
    [defaultSortBy, setSortBy]
  );
  const toggleSortDirection = useCallback(() => {
    const newSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';

    return setSortDirection(
      newSortDirection === defaultSortDirection ? undefined : newSortDirection
    );
  }, [currentSortDirection, defaultSortDirection, setSortDirection]);

  return (
    <div className="flex items-center">
      <Select
        className="bg-transparent text-gray-900 form-select sm:text-sm font-medium
          focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500 w-32 border rounded border-gray-400 "
        onChange={onSortByChange}
        options={sortByList.map(x => ({ label: x, value: x }))}
        value={sortBy || defaultSortBy}
      />
      <button
        className="text-base font-medium text-gray-500 flex items-center justify-end
         cursor-pointer ml-1 hover:bg-white hover:shadow p-1 rounded border border-transparent hover:border-gray-400"
        onClick={toggleSortDirection}
        data-tip={`Sort ${currentSortDirection === 'asc' ? 'descending' : 'ascending'}`}
      >
        {currentSortDirection === 'asc' ? <Ascending /> : <Descending />}
      </button>
    </div>
  );
};

export default SortControls;
