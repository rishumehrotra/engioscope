import React, { ChangeEvent } from 'react';
import { useQueryParam } from 'use-query-params';
import { Search } from './Icons';

const SearchInput: React.FC = () => {
  const [search, setSearchTerm] = useQueryParam<string>('search');

  return (
    <div className="w-full text-gray-600 h-full flex items-between relative shadow">
      <input
        className="bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none focus:ring focus:border-gray-200 w-full"
        type="search"
        name="search"
        placeholder="Search"
        value={search || ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value, 'replaceIn')}
      />
      <button type="button" className="absolute right-0 mt-3 mr-4">
        <Search />
      </button>
    </div>
  );
};

export default SearchInput;
