import useQueryParam, { asString, asNumber } from './use-query-param.js';
import { useQueryContext } from './query-hooks.js';
import type { DevListingFilters, DevSortKey } from '../../backend/models/commits.js';

export default (): DevListingFilters => {
  const queryContext = useQueryContext();
  const [search] = useQueryParam('search', asString);
  const [sortBy] = useQueryParam('sortBy', asString);
  const [sort] = useQueryParam('sort', asString);
  const [pageSize] = useQueryParam('pageSize', asNumber);
  const [pageNumber] = useQueryParam('pageSize', asNumber);

  const sortKey =
    sortBy && sortBy === 'Name'
      ? ('authorName' as DevSortKey)
      : sortBy && sortBy === 'Repos Committed'
      ? ('totalReposCommitted' as DevSortKey)
      : sortBy && sortBy === 'File additions'
      ? ('totalAdd' as DevSortKey)
      : sortBy && sortBy === 'File deletions'
      ? ('totalDelete' as DevSortKey)
      : ('authorName' as DevSortKey);

  return {
    queryContext,
    searchTerm: search,
    pageSize: pageSize || 20,
    pageNumber: pageNumber || 0,
    sortBy: sortKey,
    sortDirection: sort ? (sort === 'asc' ? 'asc' : 'desc') : 'asc',
  };
};
