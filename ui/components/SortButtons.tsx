import React from 'react';
import { Ascending, Descending } from './Icons';
import Select from './Select';

type SortButtonsProps = {
  sort: number;
  setSort: React.Dispatch<React.SetStateAction<number>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  labels: string[];
}

const SortButtons: React.FC<SortButtonsProps> = ({
  sort, setSort, setSortBy, sortBy, labels
}) => (
  <div className="flex items-center justify-end justify-items-end">
    <button
      className="text-base font-medium text-gray-600
      flex justify-end rounded-lg cursor-pointer"
      style={{ outline: 'none' }}
      onClick={() => setSort(sort * -1)}
    >
      {sort === 1 ? <Ascending /> : <Descending />}
      <p className="mb-1 ml-2 text-sm">Sort By</p>
    </button>
    <Select
      className="bg-transparent text-gray-900 rounded-lg border-0
      form-select p-0 pl-2 h-9 sm:text-sm font-medium
      focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500"
      onChange={setSortBy}
      options={labels.map(l => ({ label: l, value: l }))}
      value={sortBy}
    />
  </div>
);

export default SortButtons;
