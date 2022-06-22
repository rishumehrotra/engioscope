import React, { useLayoutEffect, useMemo, useRef } from 'react';
import type { ProjectOverviewAnalysis, TestCaseAggregateStats } from '../../../shared/types';
import OverviewFilters from './helpers/OverviewFilters';
import { useRemoveSort } from '../../hooks/sort-hooks';
import useGlobalFilters from './helpers/use-global-filters';
import { CycleTimeGraph } from './CycleTime';
import { workItemAccessors } from './helpers/helpers';
import { useModalHelper } from './helpers/modal-helpers';
import VelocityGraph from './Velocity';
import FlowEfficiencyGraph from './FlowEfficiency';
import BugLeakageAndRCAGraph from './BugLeakageAndRCA';
import AgeOfWorkItemsByStatus from './AgeOfWorkItemsByState';
import WIPTrendGraph from './WIPTrend';
import { AgeOfWIPItemsGraph } from './AgeOfWIPItems';
import { ChangeLeadTimeGraph } from './ChangeLeadTime';
import ProjectStats from '../ProjectStats';
import { createPalette, num } from '../../helpers/utils';
import ProjectStat from '../ProjectStat';
import NewGraph from './New';
import TimeSpentGraph from './TimeSpentGraph';

const palette = createPalette([
  '#e6194B', '#f58231', '#fabed4', '#ffe119', '#a9a9a9'
]);

type TestCaseStatsByPriority = Record<keyof Omit<TestCaseAggregateStats, 'total'>, { total: number; automated: number }>;
type TestPriority = keyof TestCaseStatsByPriority;

const TestCaseStats: React.FC<{
  title: string;
  testCasesByPriority: TestCaseStatsByPriority;
}> = ({
  title,
  testCasesByPriority
}) => (
  (
    <div className="w-72">
      <div className="mt-2 flex">
        <div className="flex-1">
          {Object.keys(testCasesByPriority).map((priority, index) => {
            const { automated, total } = testCasesByPriority[priority as TestPriority];

            return (
              <div className={`flex ${index !== 0 ? '' : ''}`} key={priority}>
                <span
                  className="w-20 text-sm self-center text-right text-gray-800"
                >
                  {`Priority ${priority.substring(1)}`}
                </span>
                <div
                  className="ml-2 flex flex-1 items-center"
                  style={{
                    // borderLeftWidth: 1
                  }}
                >
                  <div
                    className="rounded-r"
                    style={{
                      height: '50%',
                      backgroundColor: palette(priority),
                      marginLeft: 1,
                      width: `${Math.max(1, (automated / total) * 100)}%`
                    }}
                  />
                  <div className="ml-2 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-800 font-bold">
                      {((automated * 100) / total).toFixed(0)}
                      %
                    </div>
                    <div className="text-xs text-gray-600">
                      {num(automated)}
                      {' '}
                      /
                      {' '}
                      {num(total)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-xs text-center mt-4">{title}</div>
    </div>
  )
);

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const rootNode = useRef<HTMLDivElement>(null);
  const workItems = useMemo(() => Object.values(projectAnalysis.overview.byId), [projectAnalysis.overview.byId]);
  const accessors = useMemo(() => workItemAccessors(projectAnalysis), [projectAnalysis]);
  const [filteredWorkItems, filters, selectedFilters, setSelectedFilters] = useGlobalFilters(workItems);
  const [Modal, modalProps, openModal] = useModalHelper();
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
  const { total: totalNotAutomated, ...allNonAutomatedTestCases } = notAutomatedTestCases;
  const testCasesByPriority = useMemo(() => {
    const t = {} as TestCaseStatsByPriority;

    Object.keys(allAutomatedTestCases).forEach(priority => {
      const p = priority as TestPriority;
      if (allAutomatedTestCases[p] + allNonAutomatedTestCases[p]) {
        t[p] = {
          total: allAutomatedTestCases[p] + allNonAutomatedTestCases[p],
          automated: allAutomatedTestCases[p]
        };
      }
    });

    return t;
  }, [allAutomatedTestCases, allNonAutomatedTestCases]);

  const totalTestCases = totalAutomated + totalNotAutomated;

  const popup = useMemo(() => () => (
    <TestCaseStats
      testCasesByPriority={testCasesByPriority}
      title="Percentage of automated test cases"
    />
  ), [testCasesByPriority]);

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
          onClick={totalTestCases ? {
            open: 'popup',
            contents: popup
          } : undefined}
        />
      </ProjectStats>

      <div className="mb-4" />

      <OverviewFilters filters={filters} selectedFilters={selectedFilters} onChange={setSelectedFilters} />

      {[
        NewGraph, VelocityGraph, CycleTimeGraph, ChangeLeadTimeGraph,
        TimeSpentGraph, FlowEfficiencyGraph, BugLeakageAndRCAGraph,
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
