import type { ChangeEvent } from 'react';
import React from 'react';
import useQueryParam, { asString } from '../../hooks/use-query-param.js';
import { useTabs } from '../../hooks/use-tabs.js';
import { Search } from './Icons.js';
import SearchInput2 from './SearchInput2.jsx';

const SearchInput: React.FC = () => {
  const [selectedTab] = useTabs();
  const [search, setSearchTerm] = useQueryParam('search', asString);
  const [enableSearch] = useQueryParam('search-v2', asString);

  if (!selectedTab) return null;

  if (selectedTab === 'repos' && enableSearch === 'true') {
    return <SearchInput2 />;
  }

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
