import { useCallback, useMemo, useState } from 'react';
import { asc, desc } from 'sort-lib';
import { ArrowDown, ArrowUp } from '../components/common/Icons.jsx';

export function useTableSorter<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T extends Record<string, (a: any, b: any) => number>,
>(sorters: T, defaultSorter: keyof T) {
  const [sorter, setSorter] = useState({
    currentSorter: sorters[defaultSorter],
    direction: asc,
  });
  const buttonProps = useCallback(
    (sorterName: keyof T) => ({
      onClick: () => {
        setSorter(sorter => {
          if (sorter.currentSorter === sorters[sorterName]) {
            return { ...sorter, direction: sorter.direction === asc ? desc : asc };
          }
          return {
            currentSorter: sorters[sorterName],
            direction: sorterName === defaultSorter ? asc : desc,
          };
        });
      },
    }),
    [defaultSorter, sorters]
  );

  const sortIcon = useCallback(
    (sorterName: keyof typeof sorters) => {
      if (sorter.currentSorter !== sorters[sorterName]) {
        return null;
      }
      if (sorter.direction === asc) {
        return <ArrowUp className="w-4 inline-block" />;
      }
      return <ArrowDown className="w-4 inline-block" />;
    },
    [sorter.currentSorter, sorter.direction, sorters]
  );

  const sortFn = useMemo(() => {
    return sorter.direction<Parameters<T[keyof T]>[0]>(sorter.currentSorter);
  }, [sorter]);

  return { buttonProps, sortIcon, sorter: sortFn };
}
