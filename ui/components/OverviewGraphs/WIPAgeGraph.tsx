import prettyMilliseconds from 'pretty-ms';
import { prop } from 'rambda';
import React from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import type { OrganizedWorkItems } from './helpers';
import { groupByWorkItemType } from './helpers';

type WIPAgeGraphProps = {
  allWorkItems: OrganizedWorkItems;
  workItemType: (witId: string) => UIWorkItemType;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemById: (wid: number) => UIWorkItem;
  workItemTooltip: (workItem: UIWorkItem) => string;
};

export const WIPAgeGraph: React.FC<WIPAgeGraphProps> = ({
  allWorkItems, workItemType, workItemTimes, workItemById, workItemTooltip
}) => (
  <GraphCard
    title="Age of work-in-progress items"
    subtitle="How old are the currently work-in-progress items"
    left={(
      <div className="flex gap-4 justify-evenly items-center">
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
              tooltip: workItemTooltip
            }]}
            height={420}
            linkForItem={prop('url')}
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
