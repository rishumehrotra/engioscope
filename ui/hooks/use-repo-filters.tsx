import { trim } from 'rambda';
import useQueryParam, { asString, asStringArray, asNumber } from './use-query-param.js';
import type { RepoFilters, SortKey } from '../../backend/models/repo-listing.js';
import { useQueryContext } from './query-hooks.js';

export default (): RepoFilters => {
  const queryContext = useQueryContext();
  const [search] = useQueryParam('search', asStringArray);
  const [selectedGroupLabels] = useQueryParam('group', asStringArray);
  const [sortBy] = useQueryParam('sortBy', asString);
  const [sort] = useQueryParam('sort', asString);
  const [pageSize] = useQueryParam('pageSize', asNumber);
  const [pageNumber] = useQueryParam('pageSize', asNumber);

  return {
    queryContext,
    searchTerms: search?.map(trim).filter(x => x.length > 0),
    groupsIncluded: selectedGroupLabels,
    pageSize: pageSize || 10,
    pageNumber: pageNumber || 0,
    sortBy: sortBy ? (sortBy.replace(' ', '-').toLowerCase() as SortKey) : 'builds',
    sortDirection: sort ? (sort === 'asc' ? 'asc' : 'desc') : 'desc',
  };
};
