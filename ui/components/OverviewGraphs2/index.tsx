import React, { useMemo } from 'react';
import type { ProjectOverviewAnalysis } from '../../../shared/types';
import OverviewFilters from './OverviewFilters';
import { useRemoveSort } from '../../hooks/sort-hooks';
import useGlobalFilters from './use-global-filters';

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const workItems = useMemo(() => Object.values(projectAnalysis.overview.byId), [projectAnalysis.overview.byId]);
  // const wiAccessors = useMemo(() => workItemAccessors(projectAnalysis.overview), [projectAnalysis.overview]);
  const [filteredWorkItems, filters, setSelectedFilters] = useGlobalFilters(workItems);
  console.log(filteredWorkItems);
  useRemoveSort();

  return (
    <>
      <OverviewFilters filters={filters} onChange={setSelectedFilters} />
    </>
  );
};

export default OverviewGraphs;
