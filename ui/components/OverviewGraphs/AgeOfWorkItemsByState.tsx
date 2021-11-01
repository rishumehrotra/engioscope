import prettyMilliseconds from 'pretty-ms';
import { last } from 'rambda';
import React, { useMemo, useState } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { num } from '../../helpers/utils';
import { modalHeading, useModal } from '../common/Modal';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import GraphCard from './GraphCard';
import type { OrganizedWorkItems } from './helpers';
import { hasWorkItems } from './helpers';
import { sidebarWidth } from './LegendSidebar';

const workItemStateUsing = (
  workItemTimes: (wid: number) => Overview['times'][number],
  workItemById: (wid: number) => UIWorkItem,
  wit: UIWorkItemType
) => (
  (workItemId: number) => {
    const workItem = workItemById(workItemId);
    const times = workItemTimes(workItemId);

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

type AgeOfWorkItemsByStatusInnerProps = {
  groups: OrganizedWorkItems[string];
  workItemType: UIWorkItemType;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemById: (wid: number) => UIWorkItem;
  workItemTooltip: (workItem: UIWorkItem) => string;
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
};

const AgeOfWorkItemsByStatusInner: React.FC<AgeOfWorkItemsByStatusInnerProps> = ({
  groups, workItemType, workItemTimes, workItemById, workItemTooltip, workItemGroup
}) => {
  const [Modal, modalProps, open] = useModal();
  const [stateForModal, setStateForModal] = useState<string | null>(null);

  const workItemState = useMemo(
    () => workItemStateUsing(workItemTimes, workItemById, workItemType),
    [workItemById, workItemTimes, workItemType]
  );

  const totalWorkItems = useMemo(() => Object.values(groups).reduce(
    (acc, group) => acc + group.length,
    0
  ), [groups]);

  const states = useMemo(
    () => {
      const unsorted = Object.entries(groups).reduce<Record<string, { wid: number; since: Date }[]>>(
        (acc, [, wids]) => {
          wids.forEach(wid => {
            const { state, since } = workItemState(wid);
            // console.log(workItemType(witId).name, workItemById(wid).url, { state, since });
            acc[state] = acc[state] || [];
            acc[state].push({ wid, since });
          });
          return acc;
        },
        {}
      );

      return Object.fromEntries(Object.entries(unsorted).sort(([a], [b]) => (
        indexOfStateLabel(workItemType, a)
        - indexOfStateLabel(workItemType, b)
      )));
    },
    [groups, workItemState, workItemType]
  );

  const [checkboxStatesForSidebar, setCheckboxStatesForSidebar] = React.useState(
    Object.keys(states).reduce<Record<string, boolean>>((acc, state) => {
      acc[state] = true;
      return acc;
    }, {})
  );

  const [checkboxStatesForGroups, setCheckboxStatesForGroups] = React.useState(
    Object.keys(groups).reduce<Record<string, boolean>>((acc, group) => {
      acc[group] = true;
      return acc;
    }, {})
  );

  const statesToRender = useMemo(
    () => (
      Object.entries(states).reduce<typeof states>(
        (acc, [state, wids]) => {
          if (checkboxStatesForSidebar[state]) {
            acc[state] = wids.filter(({ wid }) => {
              const group = workItemGroup(wid);
              if (!group) return true;
              return checkboxStatesForGroups[group.name];
            });
          }

          return acc;
        },
        {}
      )
    ),
    [checkboxStatesForGroups, checkboxStatesForSidebar, states, workItemGroup]
  );

  return (
    <GraphCard
      title={`Age of ${workItemType.name[1].toLowerCase()} by state`}
      subtitle={`Where various ${workItemType.name[1].toLowerCase()} are located, and how long they've been there`}
      hasData={hasWorkItems({ foo: groups })}
      noDataMessage={`No ${workItemType.name[1].toLowerCase()} found`}
      left={(
        <>
          <ul className="mb-8">
            {Object.entries(groups).map(([groupName, wids]) => (
              <li key={groupName} className="inline-block">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className={`flex items-center text-sm pl-3 pr-1 mr-1 mb-1
                  border-2 border-gray-600 rounded-full  cursor-pointer shadow-inner
                  ${checkboxStatesForGroups[groupName] ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-600'}`}
                >
                  <input
                    type="checkbox"
                    checked={checkboxStatesForGroups[groupName]}
                    className="absolute opacity-0"
                    onChange={() => setCheckboxStatesForGroups(
                      checkboxStatesForGroups => ({
                        ...checkboxStatesForGroups,
                        [groupName]: !checkboxStatesForGroups[groupName]
                      })
                    )}
                  />
                  {groupName}
                  <span className="bg-yellow-400 text-black inline-block px-2 py-0 ml-2 rounded-full text-xs">
                    {num(wids.length)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <ScatterLineGraph
            graphData={[{
              label: workItemType.name[1],
              data: statesToRender,
              yAxisPoint: x => Date.now() - x.since.getTime(),
              tooltip: ({ wid }) => workItemTooltip(workItemById(wid))
            }]}
            height={400}
            linkForItem={({ wid }) => workItemById(wid).url}
          />
        </>
      )}
      right={(
        <div style={{ width: sidebarWidth }} className="justify-self-end">
          <Modal
            {...modalProps}
            heading={modalHeading(stateForModal, workItemType.name[1])}
          >
            {stateForModal && (
              <ul className="mb-8">
                {states[stateForModal]
                  .sort((a, b) => a.since.getTime() - b.since.getTime())
                  .map(({ wid, since }) => (
                    <li key={wid} className="py-2">
                      <WorkItemLinkForModal
                        workItem={workItemById(wid)}
                        workItemType={workItemType}
                      />
                      <div className="text-sm text-gray-500 ml-6">
                        {`In the '${stateForModal}' state since `}
                        {prettyMilliseconds(Date.now() - since.getTime(), { compact: true })}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </Modal>
          <div className="bg-gray-800 text-white p-4 mb-2 rounded-t-md grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold pb-1">
                {workItemType.name[1]}
              </h3>
              <div className="">
                <span className="text-2xl font-semibold">
                  {num(totalWorkItems)}
                </span>
                {' '}
                <span className="text-sm">
                  total
                </span>
              </div>
            </div>
          </div>
          <ul className="grid gap-3 grid-cols-2">
            {Object.entries(states).map(([state, wids]) => (
              <li key={state} className="relative">
                <input
                  type="checkbox"
                  className="absolute right-2 top-2 opacity-40"
                  checked={checkboxStatesForSidebar[state]}
                  onChange={e => {
                    setCheckboxStatesForSidebar(
                      checkboxStatesForSidebar => ({
                        ...checkboxStatesForSidebar,
                        [state]: !checkboxStatesForSidebar[state]
                      })
                    );
                    e.stopPropagation();
                  }}
                />

                <button
                  className="p-2 shadow rounded-md block text-left w-full border-l-4 border-gray-400"
                  onClick={() => {
                    setStateForModal(state);
                    open();
                  }}
                >
                  <h4
                    className="text-sm h-10 overflow-hidden pr-3"
                  >
                    {state}
                  </h4>
                  <div className="text-xl flex items-center font-semibold">
                    {num(wids.length)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    />
  );
};

type AgeOfWorkItemsByStatusProps = {
  allWorkItems: OrganizedWorkItems;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemById: (wid: number) => UIWorkItem;
  workItemType: (witId: string) => UIWorkItemType;
  workItemTooltip: (workItem: UIWorkItem) => string;
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
};

const AgeOfWorkItemsByStatus: React.FC<AgeOfWorkItemsByStatusProps> = ({
  allWorkItems, workItemTimes, workItemById, workItemType, workItemTooltip, workItemGroup
}) => (
  <>
    {Object.entries(allWorkItems).map(([witId, groups]) => (
      <AgeOfWorkItemsByStatusInner
        key={witId}
        groups={groups}
        workItemType={workItemType(witId)}
        workItemTimes={workItemTimes}
        workItemById={workItemById}
        workItemGroup={workItemGroup}
        workItemTooltip={workItemTooltip}
      />
    ))}
  </>
);

export default AgeOfWorkItemsByStatus;
