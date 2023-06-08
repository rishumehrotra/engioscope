import type { Types } from 'mongoose';
import type { SavedSearch } from './mongoose-models/SavedSearchModel.js';
import { SavedSearchModel } from './mongoose-models/SavedSearchModel.js';

export const insertSavedSearch = (searchView: SavedSearch) =>
  SavedSearchModel.create(searchView);

export const deleteSavedSearch = (collectionName: string, project: string, id: string) =>
  SavedSearchModel.deleteOne({ collectionName, project, id }).then(x => x.deletedCount);

export const updateSavedSearch = (searchView: SavedSearch, searchId: Types.ObjectId) =>
  SavedSearchModel.updateOne(
    {
      collectionName: searchView.collectionName,
      project: searchView.project,
      _id: searchId,
    },
    searchView,
    { upsert: true }
  ).then(x => x.upsertedId ?? null);

export const getSavedSearches = (collectionName: string, project: string) =>
  SavedSearchModel.find({ collectionName, project }).lean().exec();
