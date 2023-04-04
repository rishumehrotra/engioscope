import React, { useState } from 'react';
import Autosuggest from 'react-autosuggest';
import { trpc } from '../helpers/trpc.js';
import './styles/SearchAutocomplete.css';

// Define the type for the Project object
type Project = {
  project: string;
  name: string;
};

const SearchAutocomplete = () => {
  // When suggestion is clicked, Autosuggest needs to populate the input
  // based on the clicked suggestion. Teach Autosuggest how to calculate the
  // input value for every given suggestion.
  const getSuggestionValue = (suggestion: Project) => suggestion.project;

  // Use your imagination to render suggestions.
  const renderSuggestion = (suggestion: Project) => (
    <div className="border-solid border-1 border-stone-200 pb-4">
      <a href={`/${suggestion.name}/${suggestion.project}/`}>
        <h6 className="text-neutral-400 text-xs">{suggestion.name}</h6>
        <h4 className="text-zinc-950 text-base">{suggestion.project}</h4>
      </a>
    </div>
  );

  // Autosuggest is a controlled component.
  // This means that you need to provide an input value
  // and an onChange handler that updates this value (see below).
  // Suggestions also need to be provided to the Autosuggest,
  // and they are initially empty because the Autosuggest is closed.
  const [value, setValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Project[]>([]);
  const searchResult = trpc.collections.searchProjects.useQuery({ searchTerm: value });

  // Teach Autosuggest how to calculate suggestions for any given input value.
  const getSuggestions = (value: string) => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 || searchResult.data === undefined ? [] : searchResult.data;
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
    placeholder: 'search projects',
    value,
    onChange,
  };

  // Finally, render it!
  return (
    <Autosuggest
      suggestions={suggestions}
      onSuggestionsFetchRequested={onSuggestionsFetchRequested}
      onSuggestionsClearRequested={onSuggestionsClearRequested}
      getSuggestionValue={getSuggestionValue}
      renderSuggestion={renderSuggestion}
      inputProps={inputProps}
    />
  );
};

export default SearchAutocomplete;
