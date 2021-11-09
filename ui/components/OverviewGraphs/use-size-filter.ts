import { useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import type { OrganizedWorkItems, sizes } from './helpers';
import { getSize } from './helpers';

export default (data: OrganizedWorkItems, workItemById: (wid: number) => UIWorkItem) => {
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);

  const sizeOptions = useMemo(() => (
    [
      ...Object.values(data)
        .flatMap(x => Object.values(x))
        .flat()
        .reduce((acc, x) => {
          const size = getSize(workItemById(x));
          if (size) acc.add(size);
          return acc;
        }, new Set<typeof sizes['small']>())
    ]
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map(x => ({ value: x.key, label: x.label }))

  ), [data, workItemById]);

  const dataToShow = useMemo(
    () => (
      sizeFilter.length === 0
        ? data
        : (
          Object.entries(data).reduce<OrganizedWorkItems>((acc, [witId, group]) => {
            acc[witId] = Object.entries(group).reduce<OrganizedWorkItems[string]>((acc2, [groupName, workItemIds]) => {
              acc2[groupName] = workItemIds.filter(
                wid => {
                  const size = getSize(workItemById(wid));
                  if (!size) return false;
                  return sizeFilter.includes(size.key);
                }
              );
              return acc2;
            }, {});
            return acc;
          }, {})
        )
    ),
    [data, sizeFilter, workItemById]
  );

  return [sizeOptions, sizeFilter, setSizeFilter, dataToShow] as const;
};
