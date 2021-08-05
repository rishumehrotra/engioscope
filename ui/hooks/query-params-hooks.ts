import createUrlParamsHookFromUnion from './create-url-params-hook-from-union';
import { reposSortByParams, workItemsSortByParams } from '../types';

export const useSortOrder = createUrlParamsHookFromUnion(['asc', 'desc'], 'desc');
export const useReposSortBy = createUrlParamsHookFromUnion(reposSortByParams, 'Builds');
export const useWorkItemsSortBy = createUrlParamsHookFromUnion(workItemsSortByParams, 'Bundle size');
