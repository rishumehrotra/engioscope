import prettyMilliseconds from 'pretty-ms';
import { prop } from 'rambda';
import React, { useMemo } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from './WorkItemLinkForModal';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import type { OrganizedWorkItems } from './helpers';
import { hasWorkItems, groupByWorkItemType } from './helpers';
import { priorityBasedColor } from '../../helpers/utils';
import { createWIPWorkItemTooltip } from './tooltips';

type WIPAgeGraphProps = {
  allWorkItems: OrganizedWorkItems;
  workItemType: (witId: string) => UIWorkItemType;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemById: (wid: number) => UIWorkItem;
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
};

export const WIPAgeGraph: React.FC<WIPAgeGraphProps> = ({
  allWorkItems, workItemType, workItemTimes, workItemById, workItemGroup
}) => {
  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(workItemType, workItemTimes, workItemGroup),
    [workItemGroup, workItemTimes, workItemType]
  );

  return (
    <GraphCard
      title="Age of work-in-progress items"
      subtitle="How old are the currently work-in-progress items"
      hasData={hasWorkItems(allWorkItems)}
      noDataMessage="Couldn't find any matching work items"
      left={(
        <div className="grid gap-4 justify-evenly items-center grid-flow-col">
          {Object.entries(allWorkItems).map(([witId, group]) => (
            <ScatterLineGraph
              key={witId}
              graphData={[{
                label: workItemType(witId).name[1],
                data: Object.fromEntries(Object.entries(group).map(([groupName, workItemIds]) => [
                  groupName,
                  workItemIds
                    .filter(wid => {
                      const times = workItemTimes(wid);
                      return times.start && !times.end;
                    })
                    .map(workItemById)
                ]).filter(x => x[1].length)),
                yAxisPoint: (workItem: UIWorkItem) => Date.now() - new Date(workItem.created.on).getTime(),
                tooltip: x => workItemTooltip(x)
              }]}
              height={420}
              linkForItem={prop('url')}
              pointColor={workItem => (workItem.priority ? priorityBasedColor(workItem.priority) : undefined)}
              className="w-full"
            />
          ))}
        </div>
      )}
      right={(
        <LegendSidebar
          heading="Age of WIP items"
          headlineStats={data => (
            Object.entries(groupByWorkItemType(data))
              .map(([witId, workItemIds]) => {
                const workItems = workItemIds
                  .filter(wid => {
                    const times = workItemTimes(wid);
                    return times.start && !times.end;
                  })
                  .map(workItemById);

                return {
                  heading: workItemType(witId).name[1],
                  value: workItems.length
                    ? prettyMilliseconds(
                      workItems.reduce(
                        (acc, workItem) => acc + (Date.now() - new Date(workItem.created.on).getTime()),
                        0
                      ) / workItems.length, { compact: true }
                    )
                    : '-',
                  unit: 'avg'
                };
              })
          )}
          data={allWorkItems}
          workItemType={workItemType}
          childStat={workItemIds => {
            const itemsWithoutEndDate = workItemIds
              .filter(wid => {
                const times = workItemTimes(wid);
                return times.start && !times.end;
              })
              .map(workItemById);

            if (!itemsWithoutEndDate.length) { return '-'; }

            const totalAge = itemsWithoutEndDate.reduce((acc, { created }) => acc + (Date.now() - new Date(created.on).getTime()), 0);
            const averageAge = totalAge / itemsWithoutEndDate.length;
            return prettyMilliseconds(averageAge, { compact: true });
          }}
          modalContents={({ workItemIds }) => {
            const itemsWithoutEndDate = workItemIds
              .filter(wid => {
                const times = workItemTimes(wid);
                return times.start && !times.end;
              })
              .map(workItemById);

            return (
              <ul>
                {itemsWithoutEndDate.map(workItem => (
                  <li key={workItem.id} className="py-2">
                    <WorkItemLinkForModal
                      workItem={workItem}
                      workItemType={workItemType(workItem.typeId)}
                      tooltip={workItemTooltip}
                      flair={prettyMilliseconds(Date.now() - new Date(workItem.created.on).getTime(), { compact: true })}
                    />
                  </li>
                ))}
              </ul>
            );
          }}
        />
      )}
    />
  );
};
