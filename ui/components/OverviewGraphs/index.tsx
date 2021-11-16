import React, { useMemo } from 'react';
import type { ProjectOverviewAnalysis } from '../../../shared/types';
import OverviewFilters from './helpers/OverviewFilters';
import { useRemoveSort } from '../../hooks/sort-hooks';
import useGlobalFilters from './helpers/use-global-filters';
import { CycleTimeGraph } from './CycleTime';
import { workItemAccessors } from './helpers/helpers';
import { useWorkItemModal } from './helpers/modal-helpers';
import VelocityGraph from './Velocity';
import FlowEfficiencyGraph from './FlowEfficiency';
import EffortDistributionGraph from './EffortDistribution';
import BugLeakageAndRCAGraph from './BugLeakageAndRCA';
import AgeOfWorkItemsByStatus from './AgeOfWorkItemsByState';
import WIPTrendGraph from './WIPTrend';
import { AgeOfWIPItemsGraph } from './AgeOfWIPItems';

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const workItems = useMemo(() => Object.values(projectAnalysis.overview.byId), [projectAnalysis.overview.byId]);
  const accessors = useMemo(() => workItemAccessors(projectAnalysis), [projectAnalysis]);
  const [filteredWorkItems, filters, setSelectedFilters] = useGlobalFilters(workItems);
  const [Modal, modalProps, openModal] = useWorkItemModal();
  useRemoveSort();

  return (
    <>
      <Modal {...modalProps} />

      <OverviewFilters filters={filters} onChange={setSelectedFilters} />

      {[
        VelocityGraph, CycleTimeGraph, FlowEfficiencyGraph,
        EffortDistributionGraph, BugLeakageAndRCAGraph,
        AgeOfWorkItemsByStatus, WIPTrendGraph, AgeOfWIPItemsGraph
      ].map((Graph, index) => (
        <Graph
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          workItems={filteredWorkItems}
          accessors={accessors}
          openModal={openModal}
        />
      ))}
    </>
  );
};

export default OverviewGraphs;
