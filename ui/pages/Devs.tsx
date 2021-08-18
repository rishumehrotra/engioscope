import React, { useMemo } from 'react';
import type { ProjectRepoAnalysis } from '../../shared/types';
import Developer from '../components/Developer';
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

const Devs: React.FC = () => {
  const projectAnalysis = useFetchForProject(repoMetrics);
  const sorter = useSort(sorters, 'Name');
  const devs = useMemo(() => {
    if (projectAnalysis === 'loading') return 'loading';
    return aggregateDevs(projectAnalysis).sort(sorter);
  }, [projectAnalysis, sorter]);

  if (devs === 'loading') return <div>Loading...</div>;

  return (
    <ul>
      {devs.map((dev, index) => (
        <Developer
          key={dev.name}
          dev={dev}
          isFirst={index === 0}
        />
      ))}
    </ul>
  );
};

export default Devs;
