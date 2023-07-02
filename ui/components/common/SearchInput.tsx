import type { InputHTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Search } from './Icons.js';

const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...restProps }, inputRef) => {
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
        ref={inputRef}
        {...restProps}
      />
    </div>
  );
});

export default SearchInput;
