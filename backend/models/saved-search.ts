import type { Types } from 'mongoose';
import type { SavedSearch } from './mongoose-models/SavedSearchModel.js';
import { SavedSearchModel } from './mongoose-models/SavedSearchModel.js';

export const insertSearchView = (searchView: SavedSearch) =>
  SavedSearchModel.create(searchView);

export const deleteSearchView = (collectionName: string, project: string, id: string) =>
  SavedSearchModel.deleteOne({ collectionName, project, id }).exec();

export const updateSearchView = (searchView: SavedSearch, searchId: Types.ObjectId) => {
  return SavedSearchModel.updateOne(
    {
      collectionName: searchView.collectionName,
      project: searchView.project,
      _id: searchId,
    },
    searchView
  ).exec();
};

export const getSearchViews = (collectionName: string, project: string) =>
  SavedSearchModel.find({ collectionName, project }).lean().exec();

export const getSearchViewsCount = (collectionName: string, project: string) =>
  SavedSearchModel.find({ collectionName, project }).count().exec();

export const getSearchViewById = (collectionName: string, project: string, id: string) =>
  SavedSearchModel.find({ collectionName, project, id }).lean().exec();
