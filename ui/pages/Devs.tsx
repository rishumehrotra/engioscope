import React, { useMemo } from 'react';
import { useQueryParam } from 'use-query-params';
import type { ProjectRepoAnalysis } from '../../shared/types';
import AppliedFilters from '../components/AppliedFilters';
import Developer from '../components/Dev';
import Loading from '../components/Loading';
import { dontFilter, filterBySearch } from '../helpers/utils';
import type { SortMap } from '../hooks/sort-hooks';
import { useSort } from '../hooks/sort-hooks';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { repoMetrics } from '../network';
import type { Dev } from '../types';

const aggregateDevs = (projectAnalysis: ProjectRepoAnalysis) => (
  Object.values(projectAnalysis.repos.flatMap(repo => (
    repo.commits.byDev.map<Dev>(d => ({
      name: d.name,
      imageUrl: d.imageUrl,
      repos: [{
        name: repo.name,
        byDate: d.byDate,
        changes: d.changes
      }]
    }))
  )).reduce<Record<string, Dev>>((acc, dev) => ({
    ...acc,
    [dev.name]: {
      ...dev,
      repos: [...(acc[dev.name]?.repos || []), ...dev.repos]
    }
  }), {}))
);

const sorters: SortMap<Dev> = {
  'Name': (a, b) => b.name.toLowerCase().replace(/["“”]/gi, '').localeCompare(
    a.name.toLowerCase().replace(/["“”]/gi, '')
  )
};

const bySearch = (search: string) => (d: Dev) => filterBySearch(search, d.name);

const Devs: React.FC = () => {
  const projectAnalysis = useFetchForProject(repoMetrics);
  const [search] = useQueryParam<string>('search');

  const sorter = useSort(sorters, 'Name');
  const devs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis)
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
          />
        ))}
      </ul>
    </>
  );
};

export default Devs;
