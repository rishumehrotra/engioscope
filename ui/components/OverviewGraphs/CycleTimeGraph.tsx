import prettyMilliseconds from 'pretty-ms';
import { prop } from 'rambda';
import React, { useMemo } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from './WorkItemLinkForModal';
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
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';

type CycleTimeGraphProps = {
  closedWorkItems: OrganizedWorkItems;
  workItemType: (witId: string) => UIWorkItemType;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemById: (wid: number) => UIWorkItem;
  cycleTime: (wid: number) => number | undefined;
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
};

export const CycleTimeGraph: React.FC<CycleTimeGraphProps> = ({
  closedWorkItems, workItemType, workItemTimes, workItemById, cycleTime, workItemGroup
}) => {
  const totalCycleTime = useMemo(() => totalCycleTimeUsing(cycleTime), [cycleTime]);
  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(
      workItemType, cycleTime, workCenterTimeUsing(workItemTimes), workItemTimes, workItemGroup
    ),
    [cycleTime, workItemGroup, workItemTimes, workItemType]
  );

  const [priorityState, setPriorityState] = React.useState<string[]>([]);

  const priorities = useMemo(
    () => (
      [
        ...Object.values(closedWorkItems)
          .flatMap(x => Object.values(x))
          .flat()
          .reduce((acc, x) => {
            const { priority } = workItemById(x);
            if (priority) acc.add(priority);
            return acc;
          }, new Set<number>())
      ].sort((a, b) => a - b)
    ),
    [closedWorkItems, workItemById]
  );

  const graphScalingRatio = useMemo(
    () => (
      Object.values(closedWorkItems)
        .map(x => Object.values(x).length)
    ),
    [closedWorkItems]
  );

  return (
    <GraphCard
      title="Cycle time"
      subtitle="Time taken to complete a work item"
      hasData={hasWorkItems(closedWorkItems)}
      noDataMessage="Couldn't find any matching work items"
      left={(
        <>
          {priorities.length > 1 && (
            <div className="flex justify-end mb-8">
              <MultiSelectDropdownWithLabel
                name="priority"
                label="Priority"
                options={priorities.map(x => ({ value: String(x), label: String(x) }))}
                onChange={setPriorityState}
                value={priorityState}
              />
            </div>
          )}
          <div
            className="grid gap-4 justify-evenly items-center grid-cols-2"
            style={{ gridTemplateColumns: graphScalingRatio.map(x => `${x + 1}fr`).join(' ') }}
          >
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
                      .filter(x => {
                        if (!priorityState.length) return true;
                        return priorityState.includes(String(x.priority));
                      })
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
        </>
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
                        tooltip={workItemTooltip}
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
