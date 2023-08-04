import { useQueryContext } from '../../hooks/query-hooks.js';
import { useFilter } from './Filters.jsx';

export default () => {
  const queryContext = useQueryContext();
  const { selectedFilters } = useFilter();

  return {
    queryContext,
    filters:
      selectedFilters.length === 0
        ? undefined
        : selectedFilters.map(f => ({
            label: f.label,
            values: f.tags,
          })),
  };
};
