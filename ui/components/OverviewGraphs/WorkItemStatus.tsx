import { last, length, pipe } from 'rambda';
import React, { useMemo, useState } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { num } from '../../helpers/utils';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import GraphCard from './GraphCard';
import type { OrganizedWorkItems } from './helpers';
import { hasWorkItems } from './helpers';
import { LegendSidebar } from './LegendSidebar';

const workItemStateUsing = (
  workItemTimes: (wid: number) => Overview['times'][number],
  workItemById: (wid: number) => UIWorkItem,
  workItemType: (witId: string) => UIWorkItemType
) => (
  (workItemId: number) => {
    const workItem = workItemById(workItemId);
    const times = workItemTimes(workItemId);
    const wit = workItemType(workItem.typeId);

    const lastState = last(times.workCenters);

    if (!lastState) {
      // Not entered first work center yet
      return {
        state: `Before ${wit.workCenters[0]}`,
        since: new Date(times.start || workItem.created.on)
      };
    }

    if (lastState.end) {
      // Completed the last state
      // This either means it's done, or it's in a waiting state
      const stateIndex = wit.workCenters.findIndex(wc => wc === lastState.label);
      if (stateIndex === wit.workCenters.length - 1) {
        // It's done with workcenters
        // But it still may not be closed
        if (times.end) {
          // Ok, it's closed
          return {
            state: 'Done',
            since: new Date(times.end)
          };
        }

        return {
          state: `After ${lastState.label}`,
          since: new Date(lastState.end)
        };
      }

      // It's in a waiting state
      return {
        state: `Waiting for ${wit.workCenters[stateIndex + 1]}`,
        since: new Date(lastState.end)
      };
    }

    // It's in a working state
    return {
      state: `In ${lastState.label}`,
      since: new Date(lastState.start)
    };
  }
);

const indexOfStateLabel = (workItemType: UIWorkItemType, stateLabel: string) => {
  if (stateLabel.startsWith('Before ')) return 0;

  if (stateLabel.startsWith('In ')) {
    return (workItemType.workCenters
      .findIndex(wc => wc === stateLabel.replace('In ', '')) * 2) + 1;
  }

  if (stateLabel.startsWith('Waiting for ')) {
    return (workItemType.workCenters
      .findIndex(wc => wc === stateLabel.replace('Waiting for ', '')) * 2);
  }

  if (stateLabel.startsWith('After ')) {
    return (workItemType.workCenters
      .findIndex(wc => wc === stateLabel.replace('After ', '')) * 2) + 1;
  }

  // 'Done'
  return (workItemType.workCenters.length * 2) + 2;
};

type WorkItemStatusProps = {
  allWorkItems: OrganizedWorkItems;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemById: (wid: number) => UIWorkItem;
  workItemType: (witId: string) => UIWorkItemType;
  workItemTooltip: (workItem: UIWorkItem) => string;
};

type WidsByWitIdAndState = Record<string, Record<string, {
  wid: number;
  since: Date;
}[]>>;

const WorkItemStatus: React.FC<WorkItemStatusProps> = ({
  allWorkItems, workItemTimes, workItemById, workItemType, workItemTooltip
}) => {
  const workItemState = useMemo(() => workItemStateUsing(
    workItemTimes,
    workItemById,
    workItemType
  ), [workItemById, workItemTimes, workItemType]);

  const [checkedWits, setCheckedWits] = useState(() => (
    Object.entries(allWorkItems)
      .reduce<Record<string, boolean>>((acc, [witId, groups]) => {
        Object.keys(groups).forEach(groupName => {
          acc[witId + groupName] = true;
        });
        return acc;
      }, {})
  ));

  const splitByWitIdAndStages = useMemo(() => {
    const splitButUnsorted = Object.entries(allWorkItems)
      .reduce<WidsByWitIdAndState>((acc, [witId, group]) => {
        if (!acc[witId]) { acc[witId] = {}; }

        Object.entries(group).forEach(([groupName, wids]) => {
          if (!checkedWits[witId + groupName]) { return; }

          wids.forEach(wid => {
            const { state, since } = workItemState(wid);
            // console.log(workItemType(witId).name, workItemById(wid).url, { state, since });
            acc[witId][state] = acc[witId][state] || [];
            acc[witId][state].push({ wid, since });
          });
        });
        return acc;
      }, {});

    return Object.entries(splitButUnsorted).reduce<WidsByWitIdAndState>((acc, [witId, states]) => {
      acc[witId] = Object.fromEntries(Object.entries(states).sort(([a], [b]) => (
        indexOfStateLabel(workItemType(witId), a)
        - indexOfStateLabel(workItemType(witId), b)
      )));
      return acc;
    }, {});
  }, [allWorkItems, checkedWits, workItemState, workItemType]);

  return (
    <GraphCard
      title="Age of work items by status"
      subtitle="Where various work items are located, and how long they've been there"
      hasData={hasWorkItems(allWorkItems)}
      noDataMessage="No matching work items"
      left={(
        <div>
          {Object.entries(splitByWitIdAndStages).map(([witId, states]) => (
            <ScatterLineGraph
              key={witId}
              graphData={[{
                label: workItemType(witId).name[1],
                data: Object.fromEntries(Object.entries(states).map(([state, wids]) => [
                  `${state} (${wids.length})`,
                  wids
                ])),
                yAxisPoint: x => Date.now() - x.since.getTime(),
                tooltip: ({ wid }) => workItemTooltip(workItemById(wid))
              }]}
              height={400}
              linkForItem={({ wid }) => workItemById(wid).url}
            />
          ))}
        </div>
      )}
      right={(
        <LegendSidebar
          data={allWorkItems}
          childStat={pipe(length, num)}
          workItemType={workItemType}
          heading="Work item status"
          isCheckboxChecked={({ witId, groupName }) => checkedWits[witId + groupName]}
          onCheckboxChange={({ witId, groupName }) => {
            setCheckedWits(checkedWits => ({
              ...checkedWits,
              [witId + groupName]: !checkedWits[witId + groupName]
            }));
          }}
          headlineStats={data => (
            Object.entries(data)
              .map(([witId, groups]) => ({
                heading: workItemType(witId).name[1],
                value: num(Object.values(groups).flat().length),
                unit: 'total'
              }))
          )}
          modalContents={() => 'foo'}
        />
      )}
    />
  );
};

export default WorkItemStatus;
