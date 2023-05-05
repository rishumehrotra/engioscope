import useQueryParam, { asString, asStringArray, asNumber } from './use-query-param.js';
import type { RepoFilters } from '../../backend/models/repo-listing.js';
import { useQueryContext } from './query-hooks.js';

export default (): RepoFilters => {
  const queryContext = useQueryContext();
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asStringArray);
  // const [sortBy] = useQueryParam('sortBy', asString);
  // const [sortDirection] = useQueryParam('sortDirection', asString);
  const [pageSize] = useQueryParam('pageSize', asNumber);
  const [pageNumber] = useQueryParam('pageSize', asNumber);

  return {
    queryContext,
    searchTerm: search,
    groupsIncluded: selectedGroupLabels,
    pageSize: pageSize || 10,
    pageNumber: pageNumber || 0,
    sortBy: 'builds',
    sortDirection: 'desc',
  };
};
