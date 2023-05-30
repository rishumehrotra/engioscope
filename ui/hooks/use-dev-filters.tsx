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

  return {
    queryContext,
    searchTerm: search,
    pageSize: pageSize || 20,
    pageNumber: pageNumber || 0,
    sortBy: (sortBy as DevSortKey) || ('authorName' as DevSortKey),
    sortDirection: sort ? (sort === 'asc' ? 'asc' : 'desc') : 'desc',
  };
};
