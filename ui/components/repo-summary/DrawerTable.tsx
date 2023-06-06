import type { MouseEvent, MouseEventHandler, ReactNode } from 'react';
import React, { useMemo, Fragment, useState } from 'react';
import { asc, desc } from 'sort-lib';
import { ChevronRight, ArrowUp } from 'react-feather';
import AnimateHeight from '../common/AnimateHeight.jsx';

type DrawerTableProps<T> = {
  data: T[] | undefined;
  columns: {
    title: string;
    key: string;
    value: (x: T) => string | number | ReactNode;
    sorter: (x: T, y: T) => number;
  }[];
  ChildComponent?: React.FC<{ item: T }>;
  rowKey: (x: T) => string;
  isChild?: boolean;
  defaultSortColumnIndex?: number;
};

const DrawerTable = <T,>({
  data,
  columns,
  rowKey,
  ChildComponent,
  isChild = false,
  defaultSortColumnIndex = 0,
}: DrawerTableProps<T>) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [collapsingRows, setCollapsingRows] = useState<string[]>([]);
  const [sortColumnIndex, setSortColumnIndex] = useState<number>(defaultSortColumnIndex);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    defaultSortColumnIndex === 0 ? 'asc' : 'desc'
  );

  const sortedData = useMemo(() => {
    const { sorter } = columns[sortColumnIndex];
    return data?.sort((sortDirection === 'asc' ? asc : desc)(sorter));
  }, [columns, data, sortColumnIndex, sortDirection]);

  return (
    <table className={`w-full ${isChild ? 'bg-gray-50' : ''}`}>
      <thead>
        <tr className="bg-gray-100 text-xs text-gray-600">
          <th className="w-12"> </th>
          {columns.map((col, colIndex) => {
            return (
              <th
                key={`heading-${col.key}`}
                className={`font-normal py-2 ${
                  colIndex === 0 ? 'text-left' : 'text-right pr-4'
                }`}
              >
                <button
                  className={isChild ? '' : 'uppercase'}
                  onClick={() => {
                    if (sortColumnIndex === colIndex) {
                      return setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
                    }

                    setSortColumnIndex(colIndex);
                    setSortDirection(colIndex === 0 ? 'asc' : 'desc');
                  }}
                >
                  {col.title}
                  <span
                    className={`inline-block -mb-[0.125em] ml-1 transition-transform duration-200 ${
                      sortColumnIndex === colIndex
                        ? `w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`
                        : 'mr-3'
                    }`}
                  >
                    {sortColumnIndex === colIndex ? <ArrowUp size={12} /> : ''}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sortedData?.map(row => {
          const rk = rowKey(row);

          const isRowExpanded = expandedRows.includes(rk);

          const toggleRow: MouseEventHandler = (evt: MouseEvent) => {
            evt.stopPropagation();

            if (isRowExpanded) {
              setExpandedRows(rows => rows.filter(r => r !== rk));
              setCollapsingRows(rows => [...rows, rk]);
            } else {
              setExpandedRows(rows => [...rows, rk]);
            }
          };

          return (
            <Fragment key={rk}>
              <tr className="border-b border-gray-100 cursor-pointer" onClick={toggleRow}>
                <td>
                  {ChildComponent ? (
                    <button
                      className="block w-full h-full text-center"
                      onClick={toggleRow}
                      aria-label="Expand row"
                    >
                      <ChevronRight
                        size={18}
                        className={`inline-block mb-[0.125rem] ml-4 transition-all duration-200 text-gray-400 ${
                          isRowExpanded ? 'rotate-90 text-gray-500' : ''
                        }`}
                      />
                    </button>
                  ) : null}
                </td>
                {columns.map((col, colIndex) => {
                  const colValue = col.value(row);

                  return (
                    <td
                      key={`${rk}-${col.key}`}
                      className={`${
                        colIndex === 0 ? 'text-left' : 'text-right pr-8'
                      } py-3 ${
                        colIndex === 0 && !expandedRows.includes(rk)
                          ? ''
                          : 'font-semibold'
                      }`}
                    >
                      {colValue}
                    </td>
                  );
                })}
              </tr>
              {ChildComponent &&
              (expandedRows.includes(rk) || collapsingRows.includes(rk)) ? (
                <tr>
                  <td colSpan={columns.length + 1}>
                    <AnimateHeight
                      collapse={collapsingRows.includes(rk)}
                      onCollapsed={() =>
                        setCollapsingRows(rows => rows.filter(r => r !== rk))
                      }
                    >
                      <ChildComponent item={row} />
                    </AnimateHeight>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

export default DrawerTable;
