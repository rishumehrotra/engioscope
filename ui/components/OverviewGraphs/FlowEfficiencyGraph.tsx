import React, { useMemo } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from './WorkItemLinkForModal';
import type { OrganizedWorkItems } from './helpers';
import {
  noGroup,
  hasWorkItems, groupByWorkItemType, workCenterTimeUsing, totalWorkCenterTimeUsing,
  totalCycleTimeUsing, lineColor
} from './helpers';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import { WorkItemTimeDetails } from './WorkItemTimeDetails';
import { createCompletedWorkItemTooltip } from './tooltips';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';
import usePriorityFilter from './use-priority-filter';

type FlowEfficiencyGraphProps = {
  closedWorkItems: OrganizedWorkItems;
  workItemType: (witId: string) => UIWorkItemType;
  workItemById: (wid: number) => UIWorkItem;
  workItemTimes: (wid: number) => Overview['times'][number];
  cycleTime: (wid: number) => number | undefined;
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
};
export const FlowEfficiencyGraph: React.FC<FlowEfficiencyGraphProps> = ({
  closedWorkItems, workItemType, cycleTime, workItemById, workItemTimes, workItemGroup
}) => {
  const workCenterTime = useMemo(() => workCenterTimeUsing(workItemTimes), [workItemTimes]);
  const totalCycleTime = useMemo(() => totalCycleTimeUsing(cycleTime), [cycleTime]);
  const totalWorkCenterTime = useMemo(() => totalWorkCenterTimeUsing(workItemTimes), [workItemTimes]);
  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(
      workItemType, cycleTime, workCenterTimeUsing(workItemTimes), workItemTimes, workItemGroup
    ),
    [cycleTime, workItemGroup, workItemTimes, workItemType]
  );

  const [
    priorities, priorityState, setPriorityState, dataToShow
  ] = usePriorityFilter(closedWorkItems, workItemById);

  return (
    <GraphCard
      title="Flow efficiency"
      subtitle="Fraction of overall time that work items spend in work centers on average"
      hasData={hasWorkItems(closedWorkItems)}
      noDataMessage="Couldn't find any matching workitems"
      left={(
        <>
          <div className="flex justify-end mb-8 mr-4">
            <MultiSelectDropdownWithLabel
              label="Priority"
              options={priorities}
              value={priorityState}
              onChange={setPriorityState}
              className="w-48 text-sm"
            />
          </div>

          <ul>
            {Object.entries(dataToShow).flatMap(([witId, group]) => (
              Object.entries(group).map(([groupName, workItemIds]) => {
                const workTime = totalWorkCenterTime(workItemIds);
                const totalTime = totalCycleTime(workItemIds);
                const value = totalTime === 0 ? 0 : (workTime * 100) / totalTime;

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
                      {`${Math.round(value)}%`}
                    </span>
                    <div className="bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="rounded-md"
                        style={{
                          width: `${value}%`,
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
        </>
      )}
      right={(
        <LegendSidebar
          heading="Flow efficiency"
          data={dataToShow}
          headlineStats={data => (
            Object.entries(groupByWorkItemType(data))
              .map(([witId, workItemIds]) => {
                const workTime = totalWorkCenterTime(workItemIds);
                const totalTime = totalCycleTime(workItemIds);

                return {
                  heading: workItemType(witId).name[1],
                  value: totalTime === 0 ? '-' : `${Math.round((workTime * 100) / totalTime)}%`,
                  unit: 'avg'
                };
              })
          )}
          workItemType={workItemType}
          childStat={workItemIds => {
            const workTime = totalWorkCenterTime(workItemIds);
            const totalTime = totalCycleTime(workItemIds);
            return totalTime === 0 ? '-' : `${Math.round((workTime * 100) / totalTime)}%`;
          }}
          modalContents={({ witId, workItemIds }) => (
            <ul>
              {workItemIds
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .sort((a, b) => workCenterTime(a) / cycleTime(a)! - workCenterTime(b) / cycleTime(b)!)
                .map(wid => {
                  const workItem = workItemById(wid);
                  const totalTime = cycleTime(wid);

                  return (
                    <li className="my-4" key={wid}>
                      <WorkItemLinkForModal
                        workItem={workItem}
                        workItemType={workItemType(witId)}
                        tooltip={workItemTooltip}
                        flair={totalTime
                          ? `${Math.round(workCenterTime(wid) / totalTime)}%`
                          : '-'}
                      />
                      <WorkItemTimeDetails
                        workItem={workItem}
                        workItemTimes={workItemTimes}
                      />
                    </li>
                  );
                })}
            </ul>
          )}
        />
      )}
    />
  );
};
