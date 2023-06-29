import type { ChangeEventHandler } from 'react';
import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Search } from './Icons.js';

type SearchInputProps = {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder, disabled, className }, inputRef) => {
    return (
      <div className="w-full text-gray-600 flex items-between items-center relative">
        <span className="absolute left-3 pointer-events-none">
          <Search className="text-gray-400" />
        </span>
        <input
          className={twMerge(
            `bg-white pl-9 pr-2 rounded placeholder inline-block w-full`,
            className
          )}
          type="search"
          name="search"
          placeholder={placeholder}
          value={value}
          ref={inputRef}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }
);

export default SearchInput;
