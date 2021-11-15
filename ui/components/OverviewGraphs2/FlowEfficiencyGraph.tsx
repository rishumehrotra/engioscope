import { pipe } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import GraphCard from './GraphCard';
import type { WorkItemAccessors } from './helpers';
import {
  lineColor, noGroup, getSidebarHeadlineStats, getSidebarItemStats, getSidebarStatByKey
} from './helpers';
import type { LegendSidebarProps } from './LegendSidebar';
import { LegendSidebar } from './LegendSidebar';
import type { ModalArgs } from './modal-helpers';
import { WorkItemFlatList, workItemSubheading } from './modal-helpers';
import { PriorityFilter, SizeFilter } from './MultiSelectFilters';
import { createCompletedWorkItemTooltip } from './tooltips';
import { WorkItemTimeDetails } from './WorkItemTimeDetails';

type FlowEfficiencyProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const FlowEfficiencyGraph: React.FC<FlowEfficiencyProps> = ({
  workItems, accessors, openModal
}) => {
  const {
    isWorkItemClosed, organizeByWorkItemType, workItemType, workItemTimes
  } = accessors;
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(isWorkItemClosed),
    [isWorkItemClosed, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(preFilteredWorkItems, filter),
    [organizeByWorkItemType, preFilteredWorkItems, filter]
  );

  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(accessors),
    [accessors]
  );

  const efficiency = useCallback((workItems: UIWorkItem[]) => {
    const totalTime = accessors.totalCycleTime(workItems);
    if (totalTime === 0) return 0;
    return (accessors.totalWorkCenterTime(workItems) * 100) / totalTime;
  }, [accessors]);

  const stringifyEfficiency = useCallback(
    (efficiency: number) => (efficiency === 0 ? '-' : `${Math.round(efficiency)}%`),
    []
  );

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const items = getSidebarItemStats(
      workItemsToDisplay, workItemType, pipe(efficiency, stringifyEfficiency)
    );

    const headlineStats = getSidebarHeadlineStats(
      workItemsToDisplay, workItemType, pipe(efficiency, stringifyEfficiency), 'avg'
    );

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, workItemsToDisplay);

        return openModal({
          heading: 'Velocity over the last 30 days',
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemFlatList
              workItemType={workItemType(witId)}
              workItems={workItems}
              tooltip={workItemTooltip}
              extra={workItem => (
                <WorkItemTimeDetails
                  workItem={workItem}
                  workItemTimes={workItemTimes}
                />
              )}
            />
          )
        });
      }
    };
  }, [accessors, efficiency, openModal, stringifyEfficiency, workItemTimes, workItemTooltip, workItemsToDisplay]);

  return (
    <GraphCard
      title="Flow efficiency"
      subtitle="Fraction of overall time that work items spend in work centers on average"
      hasData={workItems.length > 0}
      noDataMessage="Couldn't find any work items"
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} />
          </div>
          {Object.entries(workItemsToDisplay).flatMap(([witId, group]) => (
            Object.entries(group).map(([groupName, workItemIds]) => {
              const eff = efficiency(workItemIds);

              return (
                <li
                  key={witId + groupName}
                  className="grid gap-4 my-4 items-center mr-4"
                  style={{ gridTemplateColumns: '25% 3ch 1fr' }}
                >
                  <div className="flex items-center justify-end">
                    <img src={workItemType(witId).icon} alt={workItemType(witId).name[0]} className="h-4 w-4 inline-block mr-1" />
                    <span className="truncate">
                      {groupName === noGroup ? workItemType(witId).name[1] : groupName}
                    </span>
                  </div>
                  <span className="justify-self-end">
                    {stringifyEfficiency(eff)}
                  </span>
                  <div className="bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="rounded-md"
                      style={{
                        width: `${eff}%`,
                        backgroundColor: lineColor({ witId, groupName }),
                        height: '30px'
                      }}
                    />
                  </div>
                </li>
              );
            })
          ))}
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default FlowEfficiencyGraph;
