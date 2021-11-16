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

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const workItems = useMemo(() => Object.values(projectAnalysis.overview.byId), [projectAnalysis.overview.byId]);
  const wiAccessors = useMemo(() => workItemAccessors(projectAnalysis), [projectAnalysis]);
  const [filteredWorkItems, filters, setSelectedFilters] = useGlobalFilters(workItems);
  const [Modal, modalProps, openModal] = useWorkItemModal();
  useRemoveSort();

  return (
    <>
      <Modal {...modalProps} />

      <OverviewFilters filters={filters} onChange={setSelectedFilters} />

      <VelocityGraph
        workItems={filteredWorkItems}
        accessors={wiAccessors}
        openModal={openModal}
      />

      <CycleTimeGraph
        workItems={filteredWorkItems}
        accessors={wiAccessors}
        openModal={openModal}
      />

      <FlowEfficiencyGraph
        workItems={filteredWorkItems}
        accessors={wiAccessors}
        openModal={openModal}
      />

      <EffortDistributionGraph
        workItems={filteredWorkItems}
        accessors={wiAccessors}
        openModal={openModal}
      />

      <BugLeakageAndRCAGraph
        workItems={filteredWorkItems}
        accessors={wiAccessors}
        openModal={openModal}
      />

      <AgeOfWorkItemsByStatus
        workItems={filteredWorkItems}
        accessors={wiAccessors}
        openModal={openModal}
      />

      <WIPTrendGraph
        workItems={filteredWorkItems}
        accessors={wiAccessors}
        openModal={openModal}
      />
    </>
  );
};

export default OverviewGraphs;
