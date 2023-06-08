import { model, Schema } from 'mongoose';

export type SavedSearch = {
  collectionName: string;
  project: string;
  name: string;
  keywords: string[];
};

const savedSearchSchema = new Schema<SavedSearch>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  name: { type: String, required: true },
  keywords: { type: [String], required: true },
});

savedSearchSchema.index({
  collectionName: 1,
  project: 1,
  _id: 1,
});

export const SavedSearchModel = model<SavedSearch>('SavedSearch', savedSearchSchema);
