import { z } from 'zod';

export const collectionAndProjectInputs = {
  collectionName: z.string(),
  project: z.string()
};

export const collectionAndProjectInputParser = z.object(collectionAndProjectInputs);

