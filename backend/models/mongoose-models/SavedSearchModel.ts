import { model, Schema } from 'mongoose';

export type SavedSearch = {
  collectionName: string;
  project: string;
  id: string;
  name: string;
  keywords: string[];
};

const savedSearchSchema = new Schema<SavedSearch>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  keywords: { type: [String], required: true },
});

savedSearchSchema.index({
  collectionName: 1,
  project: 1,
  id: 1,
});

export const SavedSearchModel = model<SavedSearch>('SavedSearch', savedSearchSchema);
