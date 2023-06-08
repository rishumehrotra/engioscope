import type { Types } from 'mongoose';
import type { SavedSearch } from './mongoose-models/SavedSearchModel.js';
import { SavedSearchModel } from './mongoose-models/SavedSearchModel.js';

export const insertSavedSearch = (searchView: SavedSearch) =>
  SavedSearchModel.create(searchView);

export const deleteSavedSearch = (searchId: Types.ObjectId) =>
  SavedSearchModel.deleteOne({ _id: searchId }).then(x => x.deletedCount);

export const updateSavedSearch = (searchView: SavedSearch, searchId: Types.ObjectId) =>
  SavedSearchModel.updateOne({ _id: searchId }, searchView, { upsert: true }).then(
    x => x.upsertedId ?? null
  );

export const getSavedSearches = (collectionName: string, project: string) =>
  SavedSearchModel.find({ collectionName, project }).lean().exec();
