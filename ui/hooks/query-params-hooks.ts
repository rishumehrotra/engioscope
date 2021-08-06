import createUrlParamsHookFromUnion from './create-url-params-hook-from-union';
import { reposSortByParams, workItemsSortByParams } from '../types';

export const useSortOrder = createUrlParamsHookFromUnion(['asc', 'desc'], 'desc', 'sort');
export const useReposSortBy = createUrlParamsHookFromUnion(reposSortByParams, 'Builds', 'sortBy');
export const useWorkItemsSortBy = createUrlParamsHookFromUnion(workItemsSortByParams, 'Bundle size', 'sortBy');
