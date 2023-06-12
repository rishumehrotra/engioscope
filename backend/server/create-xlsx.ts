import xlsx from 'xlsx';

type CreateXLSXArg<T> = {
  data: T[];
  columns: {
    title: string;
    value: (x: T) => string | number | Date;
  }[];
};

export const createXLSX = <T>({ data, columns }: CreateXLSXArg<T>) => {
  const worksheet = xlsx.utils.aoa_to_sheet([
    [],
    ...data.map(row => {
      return columns.map(col => {
        return col.value(row);
      });
    }),
  ]);

  xlsx.utils.sheet_add_aoa(worksheet, [columns.map(c => c.title)], { origin: 'A1' });
  worksheet['!autofilter'] = {
    ref: `A1:${String.fromCodePoint(columns.length + 64)}${data.length}`,
  };

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
