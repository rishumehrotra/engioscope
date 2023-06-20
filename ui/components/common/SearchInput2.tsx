import React, { useCallback, useMemo } from 'react';
import { init, last } from 'rambda';
import { asStringArray, useDebouncedQueryParam } from '../../hooks/use-query-param.js';
import { useTabs } from '../../hooks/use-tabs.js';
import type { TagState } from '../TaggedInput.jsx';
import TaggedInput from '../TaggedInput.jsx';

const SearchInput2: React.FC = () => {
  const [selectedTab] = useTabs();
  const [search, setSearchTerm] = useDebouncedQueryParam('search', asStringArray);

  const taggedInputValue: TagState = useMemo(() => {
    return {
      tags: init(search || []),
      incomplete: last(search || []) || '',
    };
  }, [search]);

  const onChange = useCallback(
    (tagState: TagState) => {
      if (tagState.tags.length === 0 && tagState.incomplete === '') {
        // eslint-disable-next-line unicorn/no-useless-undefined
        setSearchTerm(undefined);
        return;
      }

      setSearchTerm([...tagState.tags, tagState.incomplete]);
    },
    [setSearchTerm]
  );

  if (!selectedTab) return null;

  return (
    <TaggedInput
      onChange={onChange}
      value={taggedInputValue}
      placeholder="Search repositories"
    />
  );
};

export default SearchInput2;
