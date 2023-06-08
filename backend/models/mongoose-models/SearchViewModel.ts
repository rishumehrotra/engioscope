import { model, Schema } from 'mongoose';

export type SearchView = {
  collectionName: string;
  project: string;
  id: string;
  name: string;
  keywords: string[];
  description: string;
};

const searchViewSchema = new Schema<SearchView>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  keywords: { type: [String], required: true },
});

searchViewSchema.index({
  collectionName: 1,
  project: 1,
  id: 1,
});

export const SearchViewModel = model<SearchView>('SearchView', searchViewSchema);
