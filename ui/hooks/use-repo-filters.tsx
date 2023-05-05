import { useParams } from 'react-router-dom';
import { useDateRange } from './date-range-hooks.jsx';
import useQueryParam, { asString, asStringArray, asNumber } from './use-query-param.js';

type RepoFilters = {
  collectionName: string;
  project: string;
  searchTerm?: string;
  groupsIncluded?: string[];
  startDate: Date;
  endDate: Date;
  pageSize?: number;
  pageNumber?: number;
  sortBy?: 'builds' | 'branches' | 'commits' | 'pull-requests' | 'tests' | 'code-quality';
  sortDirection?: 'asc' | 'desc';
};

export default (): RepoFilters => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asStringArray);
  // const [sortBy] = useQueryParam('sortBy', asString);
  // const [sortDirection] = useQueryParam('sortDirection', asString);
  const [pageSize] = useQueryParam('pageSize', asNumber);
  const [pageNumber] = useQueryParam('pageSize', asNumber);

  const dateRange = useDateRange();

  if (!collection || !project) {
    throw new Error("Couldn't find a collection or project");
  }

  return {
    collectionName: collection,
    project,
    searchTerm: search,
    groupsIncluded: selectedGroupLabels,
    ...dateRange,
    pageSize,
    pageNumber,
    // sortBy,
    // sortDirection,
  };
};
