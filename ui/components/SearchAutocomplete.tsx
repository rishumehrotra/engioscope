import React, { useState } from 'react';
import Autosuggest from 'react-autosuggest';
import { trpc } from '../helpers/trpc.js';
import './styles/SearchAutocomplete.css';

type Project = {
  project: string;
  name: string;
};

const getSuggestionValue = (suggestion: Project) => suggestion.project;

const renderSuggestion = (suggestion: Project) => (
  <div className="border-solid border-1 border-stone-200">
    <a href={`/${suggestion.name}/${suggestion.project}/`}>
      <h4 className="text-zinc-950 text-base">{suggestion.project}</h4>
      <div className="text-gray-600 text-sm">{suggestion.name}</div>
    </a>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderInputComponent = (inputProps: any) => (
  <input {...inputProps} className="text-3xl py-2 px-3 inline-block w-full rounded-md" />
);

const SearchAutocomplete = () => {
  const [value, setValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Project[]>([]);
  const searchResult = trpc.collections.searchProjects.useQuery({ searchTerm: value });

  // Teach Autosuggest how to calculate suggestions for any given input value.
  const getSuggestions = (value: string) => {
    const inputValue = value.trim().toLowerCase();
    return inputValue.length === 0 || searchResult.data === undefined
      ? []
      : searchResult.data;
  };

  const onChange = (event: React.FormEvent, { newValue }: { newValue: string }) => {
    setValue(newValue);
  };

  // Autosuggest will call this function every time you need to update suggestions.
  // You already implemented this logic above, so just use it.
  const onSuggestionsFetchRequested = ({ value }: { value: string }) => {
    setSuggestions(getSuggestions(value));
  };

  // Autosuggest will call this function every time you need to clear suggestions.
  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  // Autosuggest will pass through all these props to the input.
  const inputProps = {
    placeholder: 'Search projects...',
    value,
    onChange,
    autoFocus: true,
  };

  // Finally, render it!
  return (
    <div className="m-auto my-14 grid place-items-center border-gray-900">
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={onSuggestionsFetchRequested}
        onSuggestionsClearRequested={onSuggestionsClearRequested}
        getSuggestionValue={getSuggestionValue}
        renderInputComponent={renderInputComponent}
        renderSuggestion={renderSuggestion}
        inputProps={inputProps}
      />
    </div>
  );
};

export default SearchAutocomplete;
