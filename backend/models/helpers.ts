import { z } from 'zod';

export const collectionAndProjectInputs = {
  collectionName: z.string(),
  project: z.string()
};

export const collectionAndProjectInputParser = z.object(collectionAndProjectInputs);

export const queryPeriodInputParser = z.tuple([z.date(), z.date(), z.string()]);
export type QueryRange = z.infer<typeof queryPeriodInputParser>;
export const timezone = (q: QueryRange) => q[2];
export const queryRangeFilter = (q: QueryRange) => ({ $gte: q[0], $lt: q[1] });
