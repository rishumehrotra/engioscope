import type { ChangeEvent } from 'react';
import React from 'react';
import useQueryParam, { asString } from '../../hooks/use-query-param.js';
import { useTabs } from '../../hooks/use-tabs.js';
import { Search } from './Icons.js';

const SearchInput: React.FC = () => {
  const [selectedTab] = useTabs();
  const [search, setSearchTerm] = useQueryParam('search', asString);

  if (!selectedTab) return null;

  return (
    <div
      className="w-full text-gray-600 h-full flex items-between items-center
    relative mr-1"
    >
      <button type="button" className="absolute left-3">
        <Search className="text-gray-400" />
      </button>
      <input
        className="bg-white h-9 pl-9 pr-1 rounded text-sm placeholder"
        type="search"
        name="search"
        placeholder="Search"
        value={search || ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setSearchTerm(e.target.value, true)
        }
      />
    </div>
  );
};

export default SearchInput;
