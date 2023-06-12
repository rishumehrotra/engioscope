import xlsx from 'xlsx';

type CreateXLSXArg<T extends object[]> = {
  data: T[];
  columns: {
    title: string;
    value: (x: T) => string | number | Date;
  }[];
};

export const createXLSX = <T extends object[]>({ data, columns }: CreateXLSXArg<T>) => {
  const worksheet = xlsx.utils.aoa_to_sheet(
    data.map(row => {
      return columns.map(col => {
        return col.value(row);
      });
    })
  );

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
