import React, { useCallback, useMemo } from 'react';
import { equals, init, last } from 'rambda';
import useQueryParam, { asStringArray } from '../../hooks/use-query-param.js';
import { useTabs } from '../../hooks/use-tabs.js';
import type { TagState } from '../TaggedInput.jsx';
import TaggedInput from '../TaggedInput.jsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <F extends (...x: any[]) => any>(fn: F, ms = 250) => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<F>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

const SearchInput2: React.FC = () => {
  const [selectedTab] = useTabs();
  const [search, setSearchTerm] = useQueryParam('search', asStringArray);

  const taggedInputValue: TagState = useMemo(() => {
    return {
      tags: init(search || []),
      incomplete: last(search || []) || '',
    };
  }, [search]);

  const debouncedSetSearchTerm = useMemo(() => debounce(setSearchTerm), [setSearchTerm]);

  const onChange = useCallback(
    (tagState: TagState) => {
      const searches = [...tagState.tags, tagState.incomplete];

      if (!equals(init(search || []), tagState.tags)) {
        setSearchTerm(searches);
        return;
      }

      if (searches.length) {
        debouncedSetSearchTerm(searches);
      } else {
        // eslint-disable-next-line unicorn/no-useless-undefined
        setSearchTerm(undefined);
      }
    },
    [debouncedSetSearchTerm, search, setSearchTerm]
  );

  if (!selectedTab) return null;

  return <TaggedInput onChange={onChange} value={taggedInputValue} />;
};

export default SearchInput2;
