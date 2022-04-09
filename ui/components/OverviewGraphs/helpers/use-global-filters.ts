import { allPass } from 'rambda';
import { useCallback, useMemo } from 'react';
import type { UIWorkItem } from '../../../../shared/types';
import useQueryParam, { asString } from '../../../hooks/use-query-param';

export type Filter = { label: string; tags: string[] };

const collectFilters = (workItems: UIWorkItem[]) => (
  Object.entries(
    workItems.reduce<Record<string, Set<string>>>((acc, workItem) => {
      if (!workItem.filterBy) return acc;

      workItem.filterBy.forEach(filter => {
        acc[filter.label] = acc[filter.label] || new Set();
        filter.tags.forEach(tag => acc[filter.label].add(tag));
      });

      return acc;
    }, {})
  ).map(([label, tags]) => ({ label, tags: [...tags].sort() }))
);

const combinedFilter = (selectedFilters: Filter[]) => {
  const collectedFilters = selectedFilters.reduce<Record<string, string[]>>(
    (acc, { label, tags }) => {
      acc[label] = tags;
      return acc;
    },
    {}
  );

  return allPass(
    selectedFilters.map(({ label, tags }) => {
      const filter = collectedFilters[label];

      return (workItem: UIWorkItem) => {
        if (!tags.length) return true; // No filter selected

        return workItem.filterBy
          ?.find(f => f.label === label)
          ?.tags.some(tag => filter.includes(tag))
          || false;
      };
    })
  );
};

const toUrlFilter = (filter: Filter[]) => (
  filter
    .filter(({ tags }) => tags.length)
    .map(({ label, tags }) => `${label}:${tags.join(',')}`)
    .join(';')
  || undefined
);

const fromUrlFilter = (urlParam = '') => (
  !urlParam
    ? []
    : urlParam
      .split(';')
      .map(part => part.split(':'))
      .map(([label, tags]) => ({ label, tags: tags.split(',') }))
);

export default (workItems: UIWorkItem[]) => {
  const [urlFilter, setUrlFilter] = useQueryParam('filter', asString);

  const filters = useMemo(() => collectFilters(workItems), [workItems]);

  const filtered = useMemo(
    () => workItems.filter(combinedFilter(fromUrlFilter(urlFilter))),
    [urlFilter, workItems]
  );

  const setSelectedFilters = useCallback((filters: Filter[]) => {
    setUrlFilter(toUrlFilter(filters), true);
  }, [setUrlFilter]);

  const selectedFilters = useMemo(
    () => fromUrlFilter(urlFilter),
    [urlFilter]
  );

  return [filtered, filters, selectedFilters, setSelectedFilters] as const;
};
