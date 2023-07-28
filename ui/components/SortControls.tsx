import React, { useCallback, useMemo } from 'react';
import { Ascending, Descending } from './common/Icons.jsx';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import InlineSelect from './common/InlineSelect.jsx';

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
      return setSortBy(newSortBy === defaultSortBy ? undefined : newSortBy, true);
    },
    [defaultSortBy, setSortBy]
  );
  const toggleSortDirection = useCallback(() => {
    const newSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';

    return setSortDirection(
      newSortDirection === defaultSortDirection ? undefined : newSortDirection,
      true
    );
  }, [currentSortDirection, defaultSortDirection, setSortDirection]);

  return (
    <div className="my-6 ml-1 flex flex-row gap-2 items-center">
      <h4 className="text-theme-helptext">Sort by</h4>

      <div className="flex items-center">
        <InlineSelect
          className="text-base"
          onChange={onSortByChange}
          options={sortByList.map(x => ({ label: x, value: x }))}
          value={sortBy || defaultSortBy}
        />
        <button
          className="text-base font-medium text-gray-500 flex items-center justify-end
         cursor-pointer ml-1 hover:bg-white hover:shadow p-1 rounded border border-transparent hover:border-gray-400"
          onClick={toggleSortDirection}
          data-tooltip-id="react-tooltip"
          data-tooltip-content={`Sort ${
            currentSortDirection === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {currentSortDirection === 'asc' ? <Ascending /> : <Descending />}
        </button>
      </div>
    </div>
  );
};

export default SortControls;
