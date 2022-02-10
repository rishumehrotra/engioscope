import React, { useLayoutEffect, useMemo, useRef } from 'react';
import type { ProjectOverviewAnalysis, TestCaseAggregateStats } from '../../../shared/types';
import OverviewFilters from './helpers/OverviewFilters';
import { useRemoveSort } from '../../hooks/sort-hooks';
import useGlobalFilters from './helpers/use-global-filters';
import { CycleTimeGraph } from './CycleTime';
import { workItemAccessors } from './helpers/helpers';
import { useWorkItemModal } from './helpers/modal-helpers';
import VelocityGraph from './Velocity';
import FlowEfficiencyGraph from './FlowEfficiency';
import BugLeakageAndRCAGraph from './BugLeakageAndRCA';
import AgeOfWorkItemsByStatus from './AgeOfWorkItemsByState';
import WIPTrendGraph from './WIPTrend';
import { AgeOfWIPItemsGraph } from './AgeOfWIPItems';
import { ChangeLeadTimeGraph } from './ChangeLeadTime';
import ReleaseSizeAndFrequency from './ReleaseSizeAndFrequency';
import ProjectStats from '../ProjectStats';
import { createPalette, num } from '../../helpers/utils';
import ProjectStat from '../ProjectStat';
import HorizontalBarGraph from '../graphs/HorizontalBarGraph';

const palette = createPalette([
  '#9A6324', '#e6194B', '#3cb44b', '#ffe119', '#000075'
]);

type TestCaseStatsByPriority = Omit<TestCaseAggregateStats, 'total'>;
type TestPriority = keyof TestCaseStatsByPriority;

const TestCaseStats: React.FC<{
  className?: string;
  title: string;
  testCasesByPriority: TestCaseStatsByPriority;
}> = ({
  className = '',
  title,
  testCasesByPriority
}) => (
  (
    <div className={`mt-2 ${className}`}>
      <HorizontalBarGraph
        className="mb-4"
        width={200}
        graphData={Object.keys(testCasesByPriority).map(priority => ({
          label: priority.toUpperCase(),
          value: testCasesByPriority[priority as TestPriority],
          color: palette(priority)
        }))}
        formatValue={value => num(value)}
      />
      <div className="text-xs text-center">{title}</div>
    </div>
  )
);

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

  const { testCases: { automated: automatedTestCases, notAutomated: notAutomatedTestCases } } = projectAnalysis;
  const { total: totalAutomated, ...allAutomatedTestCases } = automatedTestCases;
  const { total: totalNotAutomated, ...allNotAutomatedTestCases } = notAutomatedTestCases;
  const allTestCasesByPriority = useMemo(() => {
    const t = {} as typeof allAutomatedTestCases;

    Object.keys(allAutomatedTestCases).forEach(priority => {
      const p = priority as TestPriority;
      if (allAutomatedTestCases[p] + allNotAutomatedTestCases[p]) {
        t[p] = allAutomatedTestCases[p] + allNotAutomatedTestCases[p];
      }
    });

    return t;
  }, [allAutomatedTestCases, allNotAutomatedTestCases]);

  const filteredAutomatedTestCases = useMemo(() => {
    const t = {} as typeof allAutomatedTestCases;

    Object.keys(allTestCasesByPriority).forEach(priority => {
      const p = priority as TestPriority;
      t[p] = allAutomatedTestCases[p];
    });

    return t;
  }, [allAutomatedTestCases, allTestCasesByPriority]);

  const totalTestCases = totalAutomated + totalNotAutomated;

  const popup = useMemo(() => () => (
    <>
      <TestCaseStats
        testCasesByPriority={allTestCasesByPriority}
        title="Total"
        className="pr-2 border-dashed border-r-2"
      />
      <TestCaseStats
        testCasesByPriority={filteredAutomatedTestCases}
        title="Automated"
        className="pl-2"
      />
    </>
  ), [allTestCasesByPriority, filteredAutomatedTestCases]);

  return (
    <div style={{ marginBottom: '100vh' }} ref={rootNode}>
      <Modal {...modalProps} />

      <ProjectStats>
        <ProjectStat
          topStats={[{
            title: 'Test cases',
            value: num(totalTestCases),
            tooltip: 'Total number of test cases in Test Plans'
          }]}
          childStats={[{
            title: 'Automated',
            value: totalTestCases === 0
              ? '0%'
              : `${((totalAutomated * 100) / totalTestCases).toFixed(0)}%`,
            tooltip: `${num(projectAnalysis.testCases.automated.total)} automated test cases`
          }]}
          {...(totalTestCases ? { popupContents: popup } : null)}
        />
      </ProjectStats>

      <div className="mb-4" />

      <OverviewFilters filters={filters} selectedFilters={selectedFilters} onChange={setSelectedFilters} />

      {[
        ReleaseSizeAndFrequency, VelocityGraph, CycleTimeGraph, ChangeLeadTimeGraph,
        FlowEfficiencyGraph, BugLeakageAndRCAGraph,
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
