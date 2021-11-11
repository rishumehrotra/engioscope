import React, { useMemo } from 'react';
import type { ProjectOverviewAnalysis } from '../../../shared/types';
import OverviewFilters from './OverviewFilters';
import { useRemoveSort } from '../../hooks/sort-hooks';
import useGlobalFilters from './use-global-filters';
import { CycleTimeGraph } from './CycleTimeGraph';
import { workItemAccessors } from './helpers';

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const workItems = useMemo(() => Object.values(projectAnalysis.overview.byId), [projectAnalysis.overview.byId]);
  const wiAccessors = useMemo(() => workItemAccessors(projectAnalysis), [projectAnalysis]);
  const [filteredWorkItems, filters, setSelectedFilters] = useGlobalFilters(workItems);
  useRemoveSort();

  return (
    <>
      <OverviewFilters filters={filters} onChange={setSelectedFilters} />

      <CycleTimeGraph workItems={filteredWorkItems} accessors={wiAccessors} />
    </>
  );
};

export default OverviewGraphs;
