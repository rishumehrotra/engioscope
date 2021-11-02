import prettyMilliseconds from 'pretty-ms';
import { prop } from 'rambda';
import React, { useMemo } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModal';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import type { OrganizedWorkItems } from './helpers';
import {
  workCenterTimeUsing, hasWorkItems, groupByWorkItemType, totalCycleTimeUsing
} from './helpers';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import { WorkItemTimeDetails } from './WorkItemTimeDetails';
import { priorityBasedColor } from '../../helpers/utils';
import { createCompletedWorkItemTooltip } from './tooltips';

type CycleTimeGraphProps = {
  closedWorkItems: OrganizedWorkItems;
  workItemType: (witId: string) => UIWorkItemType;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemById: (wid: number) => UIWorkItem;
  cycleTime: (wid: number) => number | undefined;
};

export const CycleTimeGraph: React.FC<CycleTimeGraphProps> = ({
  closedWorkItems, workItemType, workItemTimes, workItemById, cycleTime
}) => {
  const totalCycleTime = useMemo(() => totalCycleTimeUsing(cycleTime), [cycleTime]);
  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(
      workItemType, cycleTime, workCenterTimeUsing(workItemTimes), workItemTimes
    ),
    [cycleTime, workItemTimes, workItemType]
  );

  return (
    <GraphCard
      title="Cycle time"
      subtitle="Time taken to complete a work item"
      hasData={hasWorkItems(closedWorkItems)}
      noDataMessage="Couldn't find any matching work items"
      left={(
        <div className="grid gap-4 justify-evenly items-center grid-cols-2">
          {Object.entries(closedWorkItems).map(([witId, group]) => (
            <ScatterLineGraph
              key={witId}
              graphData={[{
                label: workItemType(witId).name[1],
                data: Object.fromEntries(Object.entries(group).map(([groupName, workItemIds]) => [
                  groupName,
                  workItemIds
                    .filter(wid => {
                      const times = workItemTimes(wid);
                      return times.start && times.end;
                    })
                    .map(workItemById)
                ])),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                yAxisPoint: (workItem: UIWorkItem) => cycleTime(workItem.id)!,
                tooltip: x => workItemTooltip(x)
              }]}
              pointColor={workItem => (workItem.priority ? priorityBasedColor(workItem.priority) : undefined)}
              height={420}
              linkForItem={prop('url')}
              className="w-full"
            />
          ))}
        </div>
      )}
      right={(
        <LegendSidebar
          heading="Average cycle time"
          data={closedWorkItems}
          headlineStats={data => (
            Object.entries(groupByWorkItemType(data))
              .map(([witId, workItemIds]) => ({
                heading: workItemType(witId).name[1],
                value: workItemIds.length
                  ? prettyMilliseconds(totalCycleTime(workItemIds) / workItemIds.length, { compact: true })
                  : '-',
                unit: 'avg'
              }))
          )}
          workItemType={workItemType}
          childStat={workItemIds => prettyMilliseconds(
            totalCycleTime(workItemIds) / workItemIds.length,
            { compact: true }
          )}
          modalContents={({ witId, workItemIds }) => (
            workItemIds
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              .sort((a, b) => cycleTime(b)! - cycleTime(a)!)
              .map(id => {
                const workItem = workItemById(id);

                return (
                  <ul key={workItem.id}>
                    <li className="my-3">
                      <WorkItemLinkForModal
                        workItem={workItem}
                        workItemType={workItemType(witId)}
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        flair={prettyMilliseconds(cycleTime(workItem.id)!, { compact: true })}
                      />
                      <WorkItemTimeDetails
                        workItem={workItem}
                        workItemTimes={workItemTimes}
                      />
                    </li>
                  </ul>
                );
              })
          )}
        />
      )}
    />
  );
};
