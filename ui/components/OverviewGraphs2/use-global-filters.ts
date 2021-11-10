import { allPass } from 'rambda';
import { useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';

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

const combinedFilter = (
  filters: Filter[],
  selectedFilters: Filter[]
) => {
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

export default (workItems: UIWorkItem[]) => {
  const [selectedFilters, setSelectedFilters] = useState<Filter[]>([]);
  const filters = useMemo(() => collectFilters(workItems), [workItems]);
  const filtered = useMemo(
    () => workItems.filter(combinedFilter(filters, selectedFilters)),
    [filters, selectedFilters, workItems]
  );

  return [filtered, filters, setSelectedFilters] as const;
};
