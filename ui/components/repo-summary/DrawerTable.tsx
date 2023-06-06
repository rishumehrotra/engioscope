import type { ReactNode } from 'react';
import React, { Fragment, useState } from 'react';
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
};

const DrawerTable = <T,>({
  data,
  columns,
  rowKey,
  ChildComponent,
  isChild = false,
}: DrawerTableProps<T>) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [collapsingRows, setCollapsingRows] = useState<string[]>([]);

  return (
    <table className={`w-full ${isChild ? 'bg-gray-50' : ''}`}>
      <thead>
        <tr className="bg-gray-100 uppercase text-xs text-gray-600">
          <th className="w-12"> </th>
          {columns.map((col, colIndex) => {
            return (
              <th
                key={`heading-${col.key}`}
                className={`font-normal py-2 ${
                  colIndex === 0 ? 'text-left' : 'text-right pr-4'
                }`}
              >
                {col.title}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {data?.map(row => {
          const rk = rowKey(row);
          return (
            <Fragment key={rk}>
              <tr className="border-b border-gray-100">
                <td>
                  {ChildComponent ? (
                    <button
                      className="bg-gray-300 block w-full h-full cursor-pointer"
                      onClick={() => {
                        if (expandedRows.includes(rk)) {
                          setExpandedRows(rows => rows.filter(r => r !== rk));
                          setCollapsingRows(rows => [...rows, rk]);
                        } else {
                          setExpandedRows(rows => [...rows, rk]);
                        }
                      }}
                    >
                      &gt;
                    </button>
                  ) : null}
                </td>
                {columns.map((col, colIndex) => {
                  const colValue = col.value(row);

                  return (
                    <td
                      key={`${rk}-${col.key}`}
                      className={`${
                        colIndex === 0 ? 'text-left' : 'text-right pr-4'
                      } py-2`}
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
