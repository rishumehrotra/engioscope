import React, { forwardRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { add } from 'rambda';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown.jsx';
import useQueryParam, { asString } from '../../hooks/use-query-param.js';
import type { Filter } from '../../../shared/utils.js';
import { fromUrlFilter, toUrlFilter } from '../../../shared/utils.js';

export const useFilter = () => {
  const queryContext = useQueryContext();
  const pageConfig = trpc.workItems.getPageConfig.useQuery(
    { queryContext },
    { keepPreviousData: true }
  );

  const [urlFilter, setUrlFilter] = useQueryParam('filter', asString);

  const setSelectedFilters = useCallback(
    (filters: Filter[]) => {
      setUrlFilter(toUrlFilter(filters), true);
    },
    [setUrlFilter]
  );

  const selectedFilters = useMemo(() => fromUrlFilter(urlFilter), [urlFilter]);

  return {
    filters: pageConfig.data?.filters,
    selectedFilters,
    setSelectedFilters,
  };
};

const Filters = forwardRef<
  HTMLDivElement,
  { setRenderCount: React.Dispatch<React.SetStateAction<number>> }
>(({ setRenderCount }, ref) => {
  const { filters, selectedFilters, setSelectedFilters } = useFilter();

  const onChange = useCallback(
    (label: string) => (tags: string[]) =>
      setSelectedFilters([
        ...selectedFilters.filter(sf => sf.label !== label),
        { label, tags },
      ]),
    [selectedFilters, setSelectedFilters]
  );

  useLayoutEffect(() => {
    setRenderCount(add(1));
  }, [setRenderCount, filters]);

  return (
    <div className="flex flex-wrap gap-4" ref={ref}>
      {Object.entries(filters || {}).map(([label, values]) => (
        <MultiSelectDropdownWithLabel
          key={label}
          label={label}
          options={values.map(v => ({ label: v, value: v }))}
          value={selectedFilters.find(f => f.label === label)?.tags || []}
          onChange={onChange(label)}
        />
      ))}
    </div>
  );
});

export default Filters;
