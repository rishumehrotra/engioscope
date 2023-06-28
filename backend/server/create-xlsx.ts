import { isDate } from 'node:util/types';
import xlsx from 'xlsx';

type CreateXLSXArg<T> = {
  data: T[];
  columns: {
    title: string;
    value: (x: T) => string | number | Date | URL | null;
  }[];
};

const isURL = (x: unknown): x is URL => typeof x === 'object' && x instanceof URL;

const colNameFromIndex = (index: number) => String.fromCodePoint(index + 65);

export const createXLSX = <T>({ data, columns }: CreateXLSXArg<T>) => {
  const transformedRows = data.map(row => {
    return columns.map(col => {
      const value = col.value(row);
      return value === null ? '-' : value;
    });
  });

  const worksheet = xlsx.utils.aoa_to_sheet([
    [],
    ...transformedRows.map(row => {
      return row.map(col => {
        if (isURL(col)) return '[LINK]';
        return col;
      });
    }),
  ]);

  transformedRows.forEach((row, rowIndex) => {
    return row.forEach((col, colIndex) => {
      if (!isURL(col)) return;
      const cellName = `${colNameFromIndex(colIndex)}${rowIndex + 2}`;
      worksheet[cellName].l = {
        Target: col.toString(),
      };
    });
  });

  const colWidths = transformedRows.reduce<number[]>(
    (acc, row) => {
      row.forEach((cell, cellIndex) => {
        acc[cellIndex] = Math.max(
          acc[cellIndex],
          isDate(cell) ? 12 : isURL(cell) ? 8 : (cell?.toString() || '').length
        );
      });
      return acc;
    },
    columns.map(c => c.title.length)
  );

  worksheet['!cols'] = colWidths.map(wch => ({ wch }));

  xlsx.utils.sheet_add_aoa(worksheet, [columns.map(c => c.title)], { origin: 'A1' });
  worksheet['!autofilter'] = {
    ref: `A1:${colNameFromIndex(columns.length - 1)}${data.length}`,
  };

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  return xlsx.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    cellStyles: true,
  }) as Buffer;
};
