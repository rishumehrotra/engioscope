import { useMemo } from 'react';
import { useQueryContext } from '../hooks/query-hooks.js';
import { useFilter } from '../components/OverviewGraphs2/Filters.jsx';
import useRepoFilters from '../hooks/use-repo-filters.js';

const useCreateUrlForOverview = (slug: string) => {
  const queryContext = useQueryContext();
  const { selectedFilters, toUrlFilter } = useFilter();

  return useMemo(() => {
    return `/api/${queryContext[0]}/${queryContext[1]}/${slug}?${new URLSearchParams({
      startDate: queryContext[2].toISOString(),
      endDate: queryContext[3].toISOString(),
      ...(selectedFilters.length ? { filters: toUrlFilter(selectedFilters) } : {}),
    }).toString()}`;
  }, [queryContext, selectedFilters, slug, toUrlFilter]);
};

const useCreateUrlForRepoSummary = (slug: string) => {
  const filters = useRepoFilters();
  const queryContext = useQueryContext();

  return useMemo(() => {
    return `/api/${queryContext[0]}/${queryContext[1]}/${slug}?${new URLSearchParams({
      startDate: filters.queryContext[2].toISOString(),
      endDate: filters.queryContext[3].toISOString(),
      ...(filters.searchTerms?.length ? { search: filters.searchTerms?.join(',') } : {}),
      ...(filters.teams ? { teams: filters.teams.join(',') } : {}),
    }).toString()}`;
  }, [filters.queryContext, filters.searchTerms, filters.teams, queryContext, slug]);
};

const useCreateUrlForReleasePipelinesSummary = (slug: string) => {
  const queryContext = useQueryContext();
  const filters = useRepoFilters();
  return useMemo(() => {
    return `/api/${queryContext[0]}/${queryContext[1]}/${slug}?${new URLSearchParams({
      startDate: queryContext[2].toISOString(),
      endDate: queryContext[3].toISOString(),
      ...(filters.teams ? { teams: filters.teams.join(',') } : {}),
    }).toString()}`;
  }, [filters.teams, queryContext, slug]);
};

const useCreateUrlForContractsSummary = (slug: string) => {
  const queryContext = useQueryContext();
  return useMemo(() => {
    return `/api/${queryContext[0]}/${queryContext[1]}/${slug}?${new URLSearchParams({
      startDate: queryContext[2].toISOString(),
      endDate: queryContext[3].toISOString(),
    }).toString()}`;
  }, [queryContext, slug]);
};

export {
  useCreateUrlForOverview,
  useCreateUrlForRepoSummary,
  useCreateUrlForReleasePipelinesSummary,
  useCreateUrlForContractsSummary,
};
