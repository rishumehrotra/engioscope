import { useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import type { OrganizedWorkItems } from './helpers';

export default (data: OrganizedWorkItems, workItemById: (x: number) => UIWorkItem) => {
  const [priorityState, setPriorityState] = useState<string[]>([]);
  const priorityOptions = useMemo(
    () => (
      [
        ...Object.values(data)
          .flatMap(x => Object.values(x))
          .flat()
          .reduce((acc, x) => {
            const { priority } = workItemById(x);
            if (priority) acc.add(priority);
            return acc;
          }, new Set<number>())
      ]
        .sort((a, b) => a - b)
        .map(x => ({ value: String(x), label: String(x) }))
    ),
    [data, workItemById]
  );

  const dataToShow = useMemo(
    () => (
      priorityState.length === 0 ? data : (
        Object.entries(data).reduce<OrganizedWorkItems>((acc, [witId, group]) => {
          acc[witId] = Object.entries(group).reduce<OrganizedWorkItems[string]>((acc2, [groupName, workItems]) => {
            acc2[groupName] = workItems.filter(x => priorityState.includes(String(workItemById(x).priority)));
            return acc2;
          }, {});
          return acc;
        }, {})
      )
    ),
    [data, priorityState, workItemById]
  );

  return [priorityOptions, priorityState, setPriorityState, dataToShow] as const;
};
