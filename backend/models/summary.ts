import { z } from 'zod';
import type { Summary } from './mongoose-models/SummaryModel.js';
import { SummaryModel } from './mongoose-models/SummaryModel.js';

export const CollectionNameParser = z.object({
  collectionName: z.string(),
});

export const getCollectionSummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) => {
  const collectionSummary = await SummaryModel.find<Summary>({ collectionName });

  return collectionSummary;
};
