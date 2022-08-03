import { always, identity, prop } from 'rambda';
import React, { useEffect, useMemo, useState } from 'react';
import { asc, byNum } from '../../../../shared/sort-utils.js';
import type { UIWorkItem } from '../../../../shared/types.js';
import { MultiSelectDropdownWithLabel } from '../../common/MultiSelectDropdown.js';

type FilterProps = {
  workItems: UIWorkItem[];
  setFilter: React.Dispatch<React.SetStateAction<(wi: UIWorkItem) => boolean>>;
};

export const PriorityFilter: React.FC<FilterProps> = ({ workItems, setFilter }) => {
  const [priorityState, setPriorityState] = useState<string[]>([]);
  const priorityOptions = useMemo(() => (
    [
      ...workItems
        .reduce((acc, wi) => {
          const { priority } = wi;
          if (priority) acc.add(priority);
          return acc;
        }, new Set<number>())
    ]
      .sort(asc(byNum(identity)))
      .map(x => ({ value: String(x), label: String(x) }))
  ), [workItems]);

  useEffect(() => {
    if (priorityState.length === 0) {
      setFilter(() => always(true));
    } else {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      setFilter(() => (wi: UIWorkItem) => priorityState.includes(String(wi.priority)));
    }
  }, [priorityState, setFilter]);

  if (priorityOptions.length <= 1) return null;

  return (
    <MultiSelectDropdownWithLabel
      name="priority"
      label="Priority"
      options={priorityOptions}
      value={priorityState}
      onChange={setPriorityState}
      className="w-48 text-sm"
    />
  );
};

export const sizes = {
  small: { label: 'Small (1 impacted system)', sortIndex: 0, key: 'small' },
  medium: { label: 'Medium (upto 3 impacted systems)', sortIndex: 1, key: 'medium' },
  large: { label: 'Large (upto 5 impacted systems)', sortIndex: 2, key: 'large' },
  veryLarge: { label: 'Very large (> 5 impacted systems)', sortIndex: 3, key: 'veryLarge' }
};

export const impactedSystems = (workItem: UIWorkItem) => (
  workItem.filterBy?.find(f => f.label === 'Impacted systems')?.tags
);

export const getSize = (workItem: UIWorkItem) => {
  const numberOfImpactedSystems = impactedSystems(workItem)?.length || 0;

  if (numberOfImpactedSystems === 0) return;
  if (numberOfImpactedSystems === 1) return sizes.small;
  if (numberOfImpactedSystems <= 3) return sizes.medium;
  if (numberOfImpactedSystems <= 5) return sizes.large;
  return sizes.veryLarge;
};

export const SizeFilter: React.FC<FilterProps> = ({ workItems, setFilter }) => {
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);
  const sizeOptions = useMemo(() => (
    [
      ...workItems
        .reduce((acc, wi) => {
          const size = getSize(wi);
          if (size) acc.add(size);
          return acc;
        }, new Set<typeof sizes['small']>())
    ]
      .sort(asc(byNum(prop('sortIndex'))))
      .map(x => ({ value: x.key, label: x.label }))
  ), [workItems]);

  useEffect(() => {
    if (sizeFilter.length === 0) {
      setFilter(() => always(true));
    } else {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      setFilter(() => (wi: UIWorkItem) => {
        const size = getSize(wi);
        if (!size) return false;
        return sizeFilter.includes(size.key);
      });
    }
  }, [setFilter, sizeFilter]);

  if (sizeOptions.length <= 1) return null;

  return (
    <MultiSelectDropdownWithLabel
      name="size"
      label="Size"
      options={sizeOptions}
      onChange={setSizeFilter}
      value={sizeFilter}
      className="w-80 text-sm"
    />
  );
};
