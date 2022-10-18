import { pipe } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import { asc, byNum } from '../../../shared/sort-utils.js';
import type { UIWorkItem } from '../../../shared/types.js';
import { flowEfficiency } from '../../../shared/work-item-utils.js';
import GraphCard from './helpers/GraphCard.js';
import type { WorkItemAccessors } from './helpers/helpers.js';
import {
  listFormat,
  stringifyDateField,
  lineColor, noGroup, getSidebarHeadlineStats, getSidebarItemStats, getSidebarStatByKey
} from './helpers/helpers.js';
import type { LegendSidebarProps } from './helpers/LegendSidebar.js';
import { LegendSidebar } from './helpers/LegendSidebar.js';
import type { ModalArgs } from './helpers/modal-helpers.js';
import { WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers.js';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters.js';
import { createCompletedWorkItemTooltip } from './helpers/tooltips.js';
import { WorkItemTimeDetails } from './helpers/WorkItemTimeDetails.js';

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
    totalWorkCenterTime, cycleTime, workCenterTime, sortByEnvironment
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

  const efficiency = useMemo(() => flowEfficiency(workItemTimes), [workItemTimes]);

  const workItemsToDisplay = useMemo(
    () => Object.fromEntries(
      Object.entries(organizeByWorkItemType(preFilteredWorkItems, filter))
        .filter(([, group]) => Object.values(group).reduce((acc, wis) => acc + efficiency(wis), 0) > 0)
    ),
    [organizeByWorkItemType, preFilteredWorkItems, filter, efficiency]
  );

  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(accessors),
    [accessors]
  );

  const hasData = useMemo(
    () => totalWorkCenterTime(preFilteredWorkItems) !== 0,
    [preFilteredWorkItems, totalWorkCenterTime]
  );

  const stringifyEfficiency = useCallback(
    (efficiency: number) => (efficiency === 0 ? '-' : `${Math.round(efficiency)}%`),
    []
  );

  const workItemTimeDetails = useCallback((workItem: UIWorkItem) => (
    <WorkItemTimeDetails
      workItem={workItem}
      workItemTimes={workItemTimes}
    />
  ), [workItemTimes]);

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const items = getSidebarItemStats(
      workItemsToDisplay, accessors, pipe(efficiency, stringifyEfficiency)
    );

    const headlineStats = getSidebarHeadlineStats(
      workItemsToDisplay, workItemType, pipe(efficiency, stringifyEfficiency), 'avg'
    );

    const flairs = (workItem: UIWorkItem) => {
      const total = cycleTime(workItem);
      if (!total) return [];
      return [`${Math.round((workCenterTime(workItem) * 100) / total)}%`];
    };

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, workItemsToDisplay);
        return openModal({
          heading: 'Flow efficiency',
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemFlatList
              workItemType={workItemType(witId)}
              workItems={workItems
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .sort(asc(byNum(x => workCenterTime(x) / cycleTime(x)!)))}
              tooltip={workItemTooltip}
              flairs={flairs}
              extra={workItemTimeDetails}
            />
          )
        });
      }
    };
  }, [
    accessors, cycleTime, efficiency, openModal, stringifyEfficiency,
    workCenterTime, workItemTimeDetails, workItemTooltip, workItemType,
    workItemsToDisplay
  ]);

  return (
    <GraphCard
      title="Flow efficiency"
      subtitle="Fraction of overall time that work items spend in work centers on average"
      hasData={preFilteredWorkItems.length > 0 && hasData}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} />
          </div>
          <ul className="pb-4">
            {Object.entries(workItemsToDisplay).flatMap(([witId, group]) => (
              Object.entries(group)
                .sort(([a], [b]) => sortByEnvironment(a, b))
                .map(([groupName, workItemIds]) => {
                  const eff = efficiency(workItemIds);

                  return (
                    <li
                      key={witId + groupName}
                      className="grid gap-4 my-4 items-center"
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
              <li key={witId}>
                <details>
                  <summary className="cursor-pointer">
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
