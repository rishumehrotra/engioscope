import React, { ChangeEvent } from 'react';
import { Search } from './Icons';

type SearchInputProps = {
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
  className: string
}

const SearchInput: React.FC<SearchInputProps> = ({ searchTerm, onSearch, className }) => (
  <div className={`${className} text-gray-600 h-full flex items-between relative shadow`}>
    <input
      className="bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none focus:ring focus:border-gray-200 w-full"
      type="search"
      name="search"
      placeholder="Search Repository"
      value={searchTerm}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
    />
    <button type="button" className="absolute right-0 mt-4 mr-4">
      <Search />
    </button>
  </div>
);

export default SearchInput;
