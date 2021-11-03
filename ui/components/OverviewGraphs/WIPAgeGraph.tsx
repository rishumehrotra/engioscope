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
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';

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

  const [priorityState, setPriorityState] = React.useState<string[]>([]);
  const priorities = useMemo(
    () => (
      [
        ...Object.values(allWorkItems)
          .flatMap(x => Object.values(x))
          .flat()
          .reduce((acc, x) => {
            const { priority } = workItemById(x);
            if (priority) acc.add(priority);
            return acc;
          }, new Set<number>())
      ].sort((a, b) => a - b)
    ),
    [allWorkItems, workItemById]
  );

  const graphScalingRatio = useMemo(
    () => (
      Object.values(allWorkItems)
        .map(x => Object.values(x).length)
    ),
    [allWorkItems]
  );

  const workItemsToShow = useMemo(() => (
    Object.entries(allWorkItems)
      .reduce<OrganizedWorkItems>((acc, [witId, groups]) => {
        acc[witId] = Object.entries(groups)
          .reduce<OrganizedWorkItems[string]>((acc, [group, wids]) => {
            acc[group] = wids
              .filter(wid => {
                const times = workItemTimes(wid);
                return times.start && !times.end;
              })
              .filter(wid => {
                if (!priorityState.length) return true;
                const wi = workItemById(wid);
                if (!wi.priority) return false;
                return priorityState.includes(String(wi.priority));
              });
            return acc;
          }, {});
        return acc;
      }, {})
  ), [allWorkItems, priorityState, workItemById, workItemTimes]);

  return (
    <GraphCard
      title="Age of work-in-progress items"
      subtitle="How old are the currently work-in-progress items"
      hasData={hasWorkItems(allWorkItems)}
      noDataMessage="Couldn't find any matching work items"
      left={(
        <>
          <div className="flex justify-end mb-8">
            <MultiSelectDropdownWithLabel
              label="Priority"
              options={priorities.map(x => ({ value: String(x), label: String(x) }))}
              value={priorityState}
              onChange={setPriorityState}
              className="w-48 text-sm"
            />
          </div>
          <div
            className="grid gap-4 justify-evenly items-center grid-flow-col"
            style={{ gridTemplateColumns: graphScalingRatio.map(x => `${x + 1}fr`).join(' ') }}
          >
            {Object.entries(workItemsToShow).map(([witId, group]) => (
              <ScatterLineGraph
                key={witId}
                graphData={[{
                  label: workItemType(witId).name[1],
                  data: Object.fromEntries(Object.entries(group).map(([groupName, workItemIds]) => [
                    groupName,
                    workItemIds.map(workItemById)
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
        </>
      )}
      right={(
        <LegendSidebar
          heading="Age of WIP items"
          headlineStats={data => (
            Object.entries(groupByWorkItemType(data))
              .map(([witId, workItemIds]) => {
                const workItems = workItemIds.map(workItemById);

                return {
                  heading: workItemType(witId).name[1],
                  value: workItems.length
                    ? prettyMilliseconds(
                      workItems.reduce((acc, workItem) => (
                        acc + (Date.now() - new Date(workItem.created.on).getTime())
                      ), 0) / workItems.length,
                      { compact: true }
                    )
                    : '-',
                  unit: 'avg'
                };
              })
          )}
          data={workItemsToShow}
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
