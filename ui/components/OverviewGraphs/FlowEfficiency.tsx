import { pipe } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import GraphCard from './helpers/GraphCard';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  listFormat,
  stringifyDateField,
  lineColor, noGroup, getSidebarHeadlineStats, getSidebarItemStats, getSidebarStatByKey
} from './helpers/helpers';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createCompletedWorkItemTooltip } from './helpers/tooltips';
import { WorkItemTimeDetails } from './helpers/WorkItemTimeDetails';

type FlowEfficiencyProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const FlowEfficiencyGraph: React.FC<FlowEfficiencyProps> = ({
  workItems, accessors, openModal
}) => {
  const {
    isWorkItemClosed, organizeByWorkItemType, workItemType, workItemTimes,
    totalWorkCenterTime, totalCycleTime, cycleTime, workCenterTime
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
    const totalTime = totalCycleTime(workItems);
    if (totalTime === 0) return 0;
    return (totalWorkCenterTime(workItems) * 100) / totalTime;
  }, [totalCycleTime, totalWorkCenterTime]);

  const stringifyEfficiency = useCallback(
    (efficiency: number) => (efficiency === 0 ? '-' : `${Math.round(efficiency)}%`),
    []
  );

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
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
        const flairs = (workItem: UIWorkItem) => {
          const total = cycleTime(workItem);
          if (!total) return [];
          return [`${Math.round((workCenterTime(workItem) * 100) / total)}%`];
        };

        return openModal({
          heading: 'Flow efficiency',
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemFlatList
              workItemType={workItemType(witId)}
              workItems={workItems.sort(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                (a, b) => (workCenterTime(a) / cycleTime(a)!) - (workCenterTime(b) / cycleTime(b)!)
              )}
              tooltip={workItemTooltip}
              flairs={flairs}
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
  }, [
    cycleTime, efficiency, openModal, stringifyEfficiency, workCenterTime,
    workItemTimes, workItemTooltip, workItemType, workItemsToDisplay
  ]);

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
          <ul className="pb-4">
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
          </ul>
          <ul className="text-sm text-gray-600 pl-4 mt-4 bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {Object.keys(workItemsToDisplay).map(witId => (
              <li>
                <details>
                  <summary>
                    {`Flow efficiency for ${workItemType(witId).name[1].toLowerCase()} is the time spent in `}
                    {`${listFormat(workItemType(witId).workCenters.map(wc => wc.label))}`}
                    {' divided by the total time.'}
                  </summary>
                  <ul className="pl-8 list-disc mb-2">
                    {workItemType(witId).workCenters.map(wc => (
                      <li key={wc.label}>
                        {`Time spent in '${wc.label}' is computed from ${
                          stringifyDateField(wc.startDateField)
                        } to ${stringifyDateField(wc.endDateField)}.`}
                      </li>
                    ))}
                    <li>
                      {`Total time is the time from ${
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        stringifyDateField(workItemType(witId).startDateFields!)
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      } to ${stringifyDateField(workItemType(witId).endDateFields!)}.`}
                    </li>
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default FlowEfficiencyGraph;
