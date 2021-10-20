import React, { useMemo } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import type { OrganizedWorkItems } from './helpers';
import {
  workCenterTimeUsing,
  totalWorkCenterTimeUsing,
  timeDifference,
  totalCycleTimeUsing, allWorkItemIdsFromOrganizedGroup, lineColor, noGroup
} from './helpers';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import { WorkItemTimeDetails } from './WorkItemTimeDetails';

type FlowEfficiencyGraphProps = {
  closedWorkItems: OrganizedWorkItems;
  workItemType: (witId: string) => UIWorkItemType;
  workItemById: (wid: number) => UIWorkItem;
  workItemTimes: (wid: number) => Overview['times'][number];
  cycleTime: (wid: number) => number | undefined;
};
export const FlowEfficiencyGraph: React.FC<FlowEfficiencyGraphProps> = ({
  closedWorkItems, workItemType, cycleTime, workItemById, workItemTimes
}) => {
  const workCenterTime = useMemo(() => workCenterTimeUsing(workItemTimes), [workItemTimes]);
  const totalCycleTime = useMemo(() => totalCycleTimeUsing(cycleTime), [cycleTime]);
  const totalWorkCenterTime = useMemo(() => totalWorkCenterTimeUsing(workItemTimes), [workItemTimes]);

  return (
    <GraphCard
      title="Flow efficiency"
      subtitle="Percentage of time spent working"
      left={(
        <ul>
          {Object.entries(closedWorkItems).flatMap(([witId, group]) => (
            Object.entries(group).map(([groupName, workItemIds]) => {
              const workTime = totalWorkCenterTime(workItemIds);
              const totalTime = totalCycleTime(workItemIds);
              const value = totalTime === 0 ? 0 : (workTime * 100) / totalTime;

              return (
                <li key={witId + groupName} className="grid gap-4 my-4 items-center" style={{ gridTemplateColumns: '30% 1fr' }}>
                  <div className="text-right">
                    {workItemType(witId).name[1]}
                    {groupName === noGroup ? '' : ` ${groupName}`}
                    {`: ${Math.round(value)}%`}
                  </div>
                  <div className="bg-gray-200">
                    <div style={{
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
      )}
      right={(
        <LegendSidebar
          heading="Flow efficiency"
          data={closedWorkItems}
          headlineStatValue={(organized => {
            const allWids = allWorkItemIdsFromOrganizedGroup(organized);
            const workTime = totalWorkCenterTime(allWids);
            const totalTime = totalCycleTime(allWids);
            return totalTime === 0 ? '-' : `${Math.round((workTime * 100) / totalTime)}%`;
          })(closedWorkItems)}
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
                .map(id => {
                  const workItem = workItemById(id);
                  const times = workItemTimes(id);
                  const totalTime = cycleTime(id);

                  return (
                    <li className="my-4">
                      <WorkItemLinkForModal
                        workItem={workItem}
                        workItemType={workItemType(witId)}
                        flair={totalTime
                          ? `${Math.round(
                            (times.workCenters.reduce(
                              (acc, wc) => acc + timeDifference(wc), 0
                            ) * 100) / totalTime
                          )}%`
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
