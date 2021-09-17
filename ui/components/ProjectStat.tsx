import React, { useCallback } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../shared/types';
import usePopover from '../hooks/use-popover';
import type { FeaturesAndBugsSummaryProps } from './FeaturesAndBugsSummary';
import WorkItemCharts from './WorkItemCharts';

type Stat = {
  title: string;
  value: string;
  tooltip?: string;
};

export type ChartType = 'feature' | 'bug' | 'bugLeakage' | 'bugsClosed' | undefined;

export type ProjectStatProps = {
  topStats: Stat[];
  childStats?: Stat[];
  chartType?: ChartType;
  isOpen?: boolean;
  hasPopover?: boolean;
  workItemType?: (workItem: UIWorkItem) => UIWorkItemType;
};

const ProjectStat: React.FC<ProjectStatProps & Partial<FeaturesAndBugsSummaryProps>> = ({
  topStats, childStats, workItems, bugLeakage, chartType, hasPopover, workItemType
}) => {
  const [ref, isOpen, setIsOpen] = usePopover();

  const selectChartType = useCallback(
    () => {
      if (!hasPopover) return;
      setIsOpen(!isOpen);
    },
    [hasPopover, isOpen, setIsOpen]
  );

  return (
    <li className="relative">
      <button
        className={`p-2 border border-gray-200 bg-white shadow-sm ml-1 rounded flex
          ${isOpen ? 'border-gray-300 transform -translate-y-1' : ''}`}
        onClick={selectChartType}
      >
        {topStats ? topStats.map(({ title, value, tooltip }) => (
          <div
            key={`${title}-${value}`}
            data-tip={tooltip}
            data-html
            className={`mx-2 flex flex-col justify-end ${childStats ? 'mr-4' : ''}`}
          >
            <h3 className="text-xs font-medium">{title}</h3>
            <div className="font-bold text-2xl">
              {value}
            </div>
          </div>
        )) : null}

        {childStats ? childStats.map(({ title, value, tooltip }) => (
          <div
            data-tip={tooltip}
            data-html
            key={`${title}-${value}`}
            className="mx-2 flex flex-col h-full justify-end"
          >
            <h3 className="text-xs">{title}</h3>
            <div className="font-bold leading-7">
              {value}
            </div>
          </div>
        )) : null}
      </button>
      { isOpen && (workItems || bugLeakage) ? (
        <WorkItemCharts
          ref={ref}
          workItems={workItems}
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          workItemType={workItemType!}
          bugLeakage={bugLeakage}
          chartType={chartType}
        />
      ) : null}
    </li>
  );
};

export default ProjectStat;
