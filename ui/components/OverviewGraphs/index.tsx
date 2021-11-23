import React, { useLayoutEffect, useMemo, useRef } from 'react';
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
import { ChangeLeadTimeGraph } from './ChangeLeadTime';

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const rootNode = useRef<HTMLDivElement>(null);
  const workItems = useMemo(() => Object.values(projectAnalysis.overview.byId), [projectAnalysis.overview.byId]);
  const accessors = useMemo(() => workItemAccessors(projectAnalysis), [projectAnalysis]);
  const [filteredWorkItems, filters, selectedFilters, setSelectedFilters] = useGlobalFilters(workItems);
  const [Modal, modalProps, openModal] = useWorkItemModal();
  useRemoveSort();

  useLayoutEffect(() => {
    if (window.location.hash) {
      const element = document.querySelector(window.location.hash);
      if (element) element.scrollIntoView();
    }

    // The root node has a margin-bottom of 100vh so that the location
    // hash jump and lazy loading don't interfere with each other.
    // However, once we've done the scroll to location hash if needed,
    // we don't need the margin bottom anymore.
    setTimeout(() => {
      if (rootNode.current) rootNode.current.style.marginBottom = '0';
    }, 1000);
  }, []);

  return (
    <div style={{ marginBottom: '100vh' }} ref={rootNode}>
      <Modal {...modalProps} />

      <OverviewFilters filters={filters} selectedFilters={selectedFilters} onChange={setSelectedFilters} />

      {[
        VelocityGraph, CycleTimeGraph, ChangeLeadTimeGraph,
        FlowEfficiencyGraph, EffortDistributionGraph, BugLeakageAndRCAGraph,
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
    </div>
  );
};

export default OverviewGraphs;
