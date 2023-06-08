import { SavedSearchModel } from './mongoose-models/SavedSearchModel.js';

export const getSearchViews = (collectionName: string, project: string) =>
  SavedSearchModel.find({ collectionName, project }).lean();

export const getSearchViewsCount = (collectionName: string, project: string) =>
  SavedSearchModel.count({ collectionName, project })
    .lean()
    .then(x => x as unknown as number);

export const getSearchViewById = (collectionName: string, project: string, id: string) =>
  SavedSearchModel.find({ collectionName, project, id }).lean();
