import { prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import { prettyMS, priorityBasedColor } from '../../helpers/utils';
import type { WorkItemAccessors } from './helpers';
import { getSidebarItemStats, getSidebarHeadlineStats } from './helpers';
import { createCompletedWorkItemTooltip } from './tooltips';
import { PriorityFilter, SizeFilter } from './MultiSelectFilters';

type CycleTimeGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
};

export const CycleTimeGraph: React.FC<CycleTimeGraphProps> = ({ workItems, accessors }) => {
  const {
    isWorkItemClosed, organizeByWorkItemType, workItemTimes,
    workItemType, cycleTime, totalCycleTime
  } = accessors;

  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const preFilteredWorkItems = useMemo(
    () => workItems
      .filter(isWorkItemClosed)
      .filter(workItem => {
        const wiTimes = workItemTimes(workItem);
        return wiTimes.start && wiTimes.end;
      }),
    [isWorkItemClosed, workItemTimes, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(accessors),
    [accessors]
  );

  const aggregator = useCallback((workItems: UIWorkItem[]) => (
    workItems.length ? prettyMS(totalCycleTime(workItems) / workItems.length) : '-'
  ), [totalCycleTime]);

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(preFilteredWorkItems, filter),
    [organizeByWorkItemType, preFilteredWorkItems, filter]
  );

  const sidebarHeadlineStats = useMemo(
    () => getSidebarHeadlineStats(workItemsToDisplay, workItemType, aggregator, 'avg'),
    [aggregator, workItemType, workItemsToDisplay]
  );

  const sidebarItemStats = useMemo(
    () => getSidebarItemStats(workItemsToDisplay, workItemType, aggregator),
    [aggregator, workItemType, workItemsToDisplay]
  );

  const graphWidthRatio = useMemo(
    () => Object.values(workItemsToDisplay)
      .map(x => `${Object.values(x).length}fr`)
      .join(' '),
    [workItemsToDisplay]
  );

  return (
    <GraphCard
      title="Cycle time"
      subtitle="Time taken to complete a work item"
      hasData={preFilteredWorkItems.length > 0}
      noDataMessage="Couldn't find any matching work items"
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} />
          </div>
          <div
            className="grid gap-4 justify-between items-center grid-cols-2"
            style={{ gridTemplateColumns: graphWidthRatio }}
          >
            {Object.entries(workItemsToDisplay).map(([witId, group]) => (
              <ScatterLineGraph
                key={witId}
                graphData={[{
                  label: workItemType(witId).name[1],
                  data: group,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  yAxisPoint: (workItem: UIWorkItem) => cycleTime(workItem)!,
                  tooltip: x => workItemTooltip(x)
                }]}
                pointColor={workItem => (workItem.priority ? priorityBasedColor(workItem.priority) : undefined)}
                height={420}
                linkForItem={prop('url')}
                className="w-full"
              />
            ))}
          </div>
        </>
      )}
      right={(
        <LegendSidebar
          headlineStats={sidebarHeadlineStats}
          items={sidebarItemStats}
          onItemClick={() => null}
        />
      )}
    />
  );
};
