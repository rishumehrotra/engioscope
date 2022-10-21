import React, { useMemo } from 'react';
import AppliedFilters from '../components/AppliedFilters.js';
import Developer from '../components/Dev.js';
import Loading from '../components/Loading.js';
import { dontFilter, filterBySearch } from '../helpers/utils.js';
import type { SortMap } from '../hooks/sort-hooks.js';
import { useSort } from '../hooks/sort-hooks.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import { repoMetrics } from '../network.js';
import type { Dev } from '../types.js';
import { aggregateDevs } from '../helpers/aggregate-devs.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';

const sorters: SortMap<Dev> = {
  'Name': (a, b) => b.name.toLowerCase().replace(/["“”]/gi, '').localeCompare(
    a.name.toLowerCase().replace(/["“”]/gi, '')
  )
};

const bySearch = (search: string) => (d: Dev) => filterBySearch(search, d.name);

const Devs: React.FC = () => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const projectAnalysis = useFetchForProject(repoMetrics);
  const [search] = useQueryParam('search', asString);

  const sorter = useSort(sorters, 'Name');
  const devs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return Object.values(aggregateDevs(projectAnalysis))
      .filter(search === undefined ? dontFilter : bySearch(search))
      .sort(sorter);
  }, [projectAnalysis, search, sorter]);

  if (devs === 'loading') return <Loading />;

  return (
    <>
      <AppliedFilters type="devs" count={devs.length} />

      <ul>
        {devs.map((dev, index) => (
          <Developer
            key={dev.name}
            dev={dev}
            isFirst={index === 0}
            queryPeriodDays={queryPeriodDays}
          />
        ))}
      </ul>
    </>
  );
};

export default Devs;
