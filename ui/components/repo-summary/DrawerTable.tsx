import type { MouseEvent, MouseEventHandler, ReactNode } from 'react';
import React, { useMemo, Fragment, useState } from 'react';
import { asc, desc } from 'sort-lib';
import { ChevronRight } from 'react-feather';
import AnimateHeight from '../common/AnimateHeight.jsx';
import { ArrowDown2 } from '../common/Icons.jsx';

export type DrawerTableProps<T> = {
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
    <table className={`w-full ${isChild ? 'bg-theme-secondary' : ''}`}>
      <thead>
        <tr
          className={`bg-theme-col-header text-xs text-theme-helptext ${
            isChild ? 'border-y border-theme-seperator' : ''
          }`}
        >
          <th className="w-12"> </th>
          {columns.map((col, colIndex) => {
            return (
              <th
                key={`heading-${col.key}`}
                className={`font-normal whitespace-nowrap ${
                  colIndex === 0 ? 'text-left' : 'text-right pr-4'
                }`}
              >
                <button
                  className={`${isChild ? '' : 'uppercase'} ${
                    colIndex === 0 ? 'pr-6' : 'pl-6'
                  } py-2`}
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
                        ? `w-3 ${sortDirection === 'asc' ? '' : 'rotate-180'}`
                        : 'mr-3'
                    }`}
                  >
                    {sortColumnIndex === colIndex ? (
                      <ArrowDown2 className="w-3 h-3" />
                    ) : (
                      ''
                    )}
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

            if (!ChildComponent) return;
            if (isRowExpanded) {
              setExpandedRows(rows => rows.filter(r => r !== rk));
              setCollapsingRows(rows => [...rows, rk]);
            } else {
              setExpandedRows(rows => [...rows, rk]);
            }
          };

          return (
            <Fragment key={rk}>
              <tr
                className={`border-b border-theme-seperator ${
                  ChildComponent ? 'cursor-pointer' : ''
                } ${isChild ? 'text-sm' : ''} hover:bg-theme-hover`}
                onClick={toggleRow}
              >
                <td>
                  {ChildComponent ? (
                    <button
                      className="block w-full h-full text-center"
                      onClick={toggleRow}
                      aria-label="Expand row"
                    >
                      <ChevronRight
                        size={18}
                        className={`inline-block mb-[0.125rem] ml-4 transition-all duration-200 text-theme-icon ${
                          isRowExpanded ? 'rotate-90 text-theme-icon-active' : ''
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
                        colIndex === 0 ? 'text-left' : 'text-right pr-8 whitespace-nowrap'
                      } py-3 ${
                        (colIndex === 0 && !expandedRows.includes(rk)) || isChild
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
                  <td colSpan={columns.length + 1} className="p-0">
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
