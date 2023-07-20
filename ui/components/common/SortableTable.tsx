import type { MouseEvent, MouseEventHandler, ReactNode } from 'react';
import React, { useMemo, Fragment, useState } from 'react';
import { asc, desc } from 'sort-lib';
import { ChevronRight } from 'react-feather';
import { twJoin, twMerge } from 'tailwind-merge';
import { identity } from 'rambda';
import AnimateHeight from './AnimateHeight.jsx';
import { ArrowDown2 } from './Icons.jsx';
import TinyAreaGraph, { graphConfig } from '../graphs/TinyAreaGraph.jsx';

type GraphValue = {
  type: 'graph';
  data: (number | undefined)[];
  color: {
    line: string;
    area: string;
  };
};

export type SortableTableProps<T> = {
  data: T[] | undefined;
  columns: {
    title: string;
    key: string;
    value: (x: T) => string | number | ReactNode | GraphValue;
    sorter?: (x: T, y: T) => number;
  }[];
  ChildComponent?: React.FC<{ item: T }>;
  rowKey: (x: T) => string;
  isChild?: boolean;
  defaultSortColumnIndex?: number;
  variant: 'default' | 'drawer';
  hasChild?: (x: T) => boolean;
  additionalRowClassName?: (x: T) => string;
};

const isGraph = (value: unknown): value is GraphValue => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'graph'
  );
};

const SortableTable = <T,>({
  data,
  columns,
  rowKey,
  ChildComponent,
  isChild = false,
  defaultSortColumnIndex = 0,
  variant,
  hasChild = () => true,
  additionalRowClassName,
}: SortableTableProps<T>) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [collapsingRows, setCollapsingRows] = useState<string[]>([]);
  const [sortColumnIndex, setSortColumnIndex] = useState<number>(defaultSortColumnIndex);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    defaultSortColumnIndex === 0 ? 'asc' : 'desc'
  );

  const sortedData = useMemo(() => {
    const { sorter } = columns[sortColumnIndex];
    if (!sorter) return data;
    return data?.sort((sortDirection === 'asc' ? asc : desc)(sorter));
  }, [columns, data, sortColumnIndex, sortDirection]);

  return (
    <table
      className={`w-full ${
        isChild
          ? 'bg-theme-secondary'
          : variant === 'default'
          ? 'bg-theme-page-content'
          : ''
      }`}
    >
      <thead>
        <tr
          className={twJoin(
            variant === 'default'
              ? 'bg-theme-hover border-b border-theme-seperator'
              : 'bg-theme-col-header',
            'text-xs text-theme-helptext',
            isChild && 'border-y border-theme-seperator'
          )}
        >
          <th className={ChildComponent || isChild ? 'w-12' : 'w-5'}> </th>
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
                  } py-2 ${col.sorter ? '' : 'cursor-default'}`}
                  onClick={() => {
                    if (!col.sorter) return;
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
            if (!hasChild(row)) return;
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
                className={twMerge(
                  'border-b border-theme-seperator',
                  ChildComponent &&
                    hasChild(row) &&
                    'cursor-pointer hover:bg-theme-hover',
                  isChild && 'text-sm',
                  additionalRowClassName?.(row)
                )}
                onClick={toggleRow}
              >
                <td>
                  {ChildComponent && hasChild(row) ? (
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
                  const isGraphValue = isGraph(colValue);

                  return (
                    <td
                      key={`${rk}-${col.key}`}
                      className={twJoin(
                        'align-top',
                        colIndex === 0
                          ? 'text-left'
                          : 'text-right pr-8 whitespace-nowrap',
                        isGraphValue && variant === 'default' ? 'py-1' : 'py-0',
                        !isGraphValue && variant === 'default' ? 'py-4' : 'py-3',
                        (colIndex === 0 && !expandedRows.includes(rk)) || isChild
                          ? ''
                          : variant === 'default'
                          ? ''
                          : 'font-semibold'
                      )}
                    >
                      {isGraphValue ? (
                        <TinyAreaGraph
                          data={colValue.data}
                          itemToValue={identity}
                          color={colValue.color}
                          graphConfig={graphConfig.small}
                        />
                      ) : (
                        colValue
                      )}
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

export default SortableTable;
