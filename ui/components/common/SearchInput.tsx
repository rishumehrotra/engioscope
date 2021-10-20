import type { ChangeEvent } from 'react';
import React from 'react';
import { useQueryParam } from 'use-query-params';
import { useTabs } from '../../hooks/use-tabs';
import { Search } from './Icons';

const SearchInput: React.FC = () => {
  const [selectedTab] = useTabs();
  const [search, setSearchTerm] = useQueryParam<string>('search');

  if (!selectedTab) return null;

  return (
    <div className="w-full text-gray-600 h-full flex items-between items-center
    relative shadow mr-1 rounded border border-gray-400"
    >
      <button type="button" className="absolute left-3">
        <Search className="text-gray-400" />
      </button>
      <input
        className="bg-white h-9 pl-9 pr-1 rounded-lg text-sm focus:outline-none
        focus:ring focus:border-gray-100 w-full placeholder-gray-600 placeholder"
        type="search"
        name="search"
        placeholder="Search"
        value={search || ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value, 'replaceIn')}
      />
    </div>
  );
};

export default SearchInput;
