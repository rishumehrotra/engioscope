import { z } from 'zod';
import { oneWeekInMs } from '../../shared/utils.js';

export const queryContextInputParser = z.tuple([
  z.string(),
  z.string(),
  z.date(),
  z.date(),
]);

export type QueryContext = z.infer<typeof queryContextInputParser>;

export const fromContext = (x: QueryContext) => {
  return {
    collectionName: x[0],
    project: x[1],
    startDate: x[2],
    endDate: x[3],
  };
};

export const weekIndexValue = (startDate: Date, field: string) => ({
  $trunc: { $divide: [{ $subtract: [field, startDate] }, oneWeekInMs] },
});
