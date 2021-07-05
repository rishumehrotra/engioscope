import React, { ChangeEvent } from 'react';
import { Search } from './Icons';

type SearchInputProps = {
  searchString: string;
  onSearch: (searchString: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ searchString, onSearch }) => (
  <div className="pt-3 relative mx-auto text-gray-600">
    <input
      className="bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none w-full"
      type="search"
      name="search"
      placeholder="Search Repository"
      value={searchString}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
    />
    <button type="button" className="absolute right-0 top-0 mt-6 mr-4">
      <Search />
    </button>
  </div>
);

export default SearchInput;
