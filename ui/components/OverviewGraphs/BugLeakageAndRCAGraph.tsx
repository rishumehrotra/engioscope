import { length } from 'rambda';
import React, { useEffect, useMemo, useState } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { num } from '../../helpers/utils';
import { modalHeading, useModal } from '../common/Modal';
import { WorkItemLinkForModal } from './WorkItemLinkForModal';
import GraphCard from './GraphCard';
import type { OrganizedWorkItems } from './helpers';
import { lineColor, hasWorkItems } from './helpers';
import { LegendSidebar } from './LegendSidebar';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';
import { createWIPWorkItemTooltip } from './tooltips';

const isBugLike = (workItemType: (witId: string) => UIWorkItemType, witId: string) => (
  workItemType(witId).name[0].toLowerCase().includes('bug')
);

const bugLikeWorkItems = (
  allWorkItems: OrganizedWorkItems,
  workItemType: (witId: string) => UIWorkItemType
) => Object.fromEntries(
  Object.entries(allWorkItems).filter(
    ([witId]) => isBugLike(workItemType, witId)
  )
);

const bugsLeakedInLastMonth = (
  lastUpdated: string, workItemById: (wid: number) => UIWorkItem
) => {
  const lastMonth = new Date(lastUpdated);
  lastMonth.setDate(lastMonth.getDate() - 30);

  return (wid: number) => {
    const wi = workItemById(wid);
    if (wi.state.toLowerCase() === 'withdrawn') return false;
    return new Date(wi.created.on) >= lastMonth;
  };
};

const organizeWorkItemsByRCAIndex = (index: number, noValue: string) => (workItemById: (wid: number) => UIWorkItem, wids: number[]) => (
  wids.reduce<Record<string, UIWorkItem[]>>((acc, wid) => {
    const wi = workItemById(wid);
    const categoryName = wi.rca?.[index] || noValue;
    acc[categoryName] = (acc[categoryName] || []).concat(wi);
    return acc;
  }, {})
);

const organizeWorkItemsByRCACategory = organizeWorkItemsByRCAIndex(0, 'Not classified');
const organizeWorkItemsByRCAReason = organizeWorkItemsByRCAIndex(1, 'No reason provided');

const initialCheckboxState = (groups: Record<string, number[]>) => (
  Object.keys(groups)
    .reduce<Record<string, boolean>>((acc, groupName) => {
      acc[groupName] = true;
      return acc;
    }, {})
);

type WorkItemCardProps = {
  witId: string;
  workItemById: (wid: number) => UIWorkItem;
  workItemType: (witId: string) => UIWorkItemType;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
  groups: OrganizedWorkItems[string];
};

const WorkItemCard: React.FC<WorkItemCardProps> = ({
  witId, workItemById, workItemType, groups, workItemTimes, workItemGroup
}) => {
  const [Modal, modalProps, open] = useModal();
  const [modalBar, setModalBar] = useState<{label: string; color: string} | null>(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = React.useState(initialCheckboxState(groups));

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(workItemType, workItemTimes, workItemGroup),
    [workItemGroup, workItemTimes, workItemType]
  );

  const organizedByRCACategory = useMemo(() => (
    organizeWorkItemsByRCACategory(
      workItemById,
      Object.entries(groups).reduce<number[]>((acc, [groupName, wids]) => {
        if (selectedCheckboxes[groupName]) acc.push(...wids);
        return acc;
      }, [])
    )
  ), [groups, selectedCheckboxes, workItemById]);

  const [priorityState, setPriorityState] = useState<string[]>([]);

  const priorities = useMemo(() => (
    [
      ...Object.values(organizedByRCACategory)
        .reduce((acc, wis) => {
          wis.forEach(wi => {
            if (wi.priority) acc.add(wi.priority);
          });
          return acc;
        }, new Set<number>())
    ].sort((a, b) => a - b)
  ), [organizedByRCACategory]);

  const graphData = useMemo(() => (
    Object.entries(organizedByRCACategory)
      .map(([rcaCategory, wis]) => ({
        label: rcaCategory,
        value: wis
          .filter(wi => {
            if (priorityState.length === 0) return true;
            if (!wi.priority) return false;
            return priorityState.includes(String(wi.priority));
          })
          .length,
        color: '#00bcd4'
      }))
      .filter(({ value }) => value > 0)
      .sort((a, b) => b.value - a.value)
  ), [organizedByRCACategory, priorityState]);

  useEffect(() => setSelectedCheckboxes(initialCheckboxState(groups)), [groups]);

  const total = graphData.reduce((acc, { value }) => acc + value, 0);
  const maxValue = Math.max(...graphData.map(({ value }) => value));

  return (
    <GraphCard
      title={`${workItemType(witId).name[0]} leakage with root cause`}
      subtitle={`${workItemType(witId).name[1]} leaked over the last 30 days with their root cause`}
      hasData={hasWorkItems({ [witId]: groups })}
      noDataMessage="Couldn't find any matching workitems"
      left={(
        <>
          {(() => {
            const organizedByReason = Object.entries(
              modalBar
                ? (
                  organizeWorkItemsByRCAReason(
                    workItemById,
                    (organizedByRCACategory[modalBar.label] || []).map(wi => wi.id)
                  )
                )
                : {}
            )
              .map(([rcaReason, wis]) => ([
                rcaReason,
                wis.filter(wi => {
                  if (priorityState.length === 0) return true;
                  if (!wi.priority) return false;
                  return priorityState.includes(String(wi.priority));
                })
              ] as const))
              .filter(([, wis]) => wis.length > 0)
              .sort(([, a], [, b]) => b.length - a.length);

            const maxBarValue = Math.max(...organizedByReason.map(([, wis]) => wis.length));
            const total = organizedByReason.reduce((acc, [, wids]) => acc + wids.length, 0);

            return (
              <Modal
                heading={modalBar
                  ? modalHeading('Bug leakage', `${modalBar.label} (${total})`)
                  : ''}
                {...modalProps}
              >
                {!modalBar
                  ? 'Nothing to see here'
                  : organizedByReason.map(([rcaReason, wis]) => (
                    <details key={rcaReason} className="mb-2">
                      <summary className="cursor-pointer">
                        <div
                          style={{ width: 'calc(100% - 20px)' }}
                          className="inline-block relative"
                        >
                          <div
                            style={{
                              width: `${(wis.length / maxBarValue) * 100}%`,
                              backgroundColor: modalBar.color
                            }}
                            className="absolute top-0 left-0 h-full bg-opacity-50 rounded-md"
                          />
                          <h3
                            className="z-10 relative text-lg pl-2"
                          >
                            {`${rcaReason}: ${wis.length} (${Math.round((wis.length * 100) / total)}%)`}
                          </h3>
                        </div>
                      </summary>
                      <ul className="pl-6">
                        {wis
                          .sort((a, b) => (a.priority || 5) - (b.priority || 5))
                          .map(wi => (
                            <li key={wi.id} className="py-2">
                              <WorkItemLinkForModal
                                key={wi.id}
                                workItem={wi}
                                workItemType={workItemType(witId)}
                                tooltip={workItemTooltip}
                                flair={`Priority ${wi.priority || 'unknown'}`}
                              />
                            </li>
                          ))}
                      </ul>
                    </details>
                  ))}
              </Modal>
            );
          })()}
          <div className="flex justify-end mb-8 mr-4">
            <MultiSelectDropdownWithLabel
              label="Priority"
              options={priorities.map(priority => ({ label: String(priority), value: String(priority) }))}
              value={priorityState}
              onChange={setPriorityState}
              className="w-48 text-sm"
            />
          </div>
          <ul>
            {graphData.map(({ label, value, color }) => (
              <li key={label} className="mr-4">
                <button
                  className="grid gap-4 my-3 w-full rounded-lg items-center hover:bg-gray-100 cursor-pointer"
                  style={{ gridTemplateColumns: '20% 85px 1fr' }}
                  onClick={() => {
                    setModalBar({ label, color });
                    open();
                  }}
                >
                  <div className="flex items-center justify-end">
                    <span className="truncate">
                      {label}
                    </span>
                  </div>
                  <span className="justify-self-end">
                    {`${value} (${Math.round((value * 100) / total)}%)`}
                  </span>
                  <div className="bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="rounded-md"
                      style={{
                        width: `${(value * 100) / maxValue}%`,
                        backgroundColor: color,
                        height: '30px'
                      }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      right={(
        <LegendSidebar
          data={{ [witId]: groups }}
          childStat={length}
          heading={`${workItemType(witId).name[0]} leakage`}
          workItemType={workItemType}
          headlineStats={x => ([{
            heading: `Total ${workItemType(witId).name[1].toLowerCase()} leaked`,
            value: num(Object.values(x).reduce((acc, group) => (
              acc + Object.values(group).reduce((acc2, wids) => acc2 + wids.length, 0)
            ), 0))
          }])}
          isCheckboxChecked={({ groupName }) => selectedCheckboxes[groupName]}
          onCheckboxChange={({ groupName }) => (
            setSelectedCheckboxes(
              selectedCheckboxes => ({ ...selectedCheckboxes, [groupName]: !selectedCheckboxes[groupName] })
            )
          )}
          modalContents={({ workItemIds, groupName }) => {
            const organizedByCategory = organizeWorkItemsByRCACategory(workItemById, workItemIds);
            const maxInCategory = Object.values(organizedByCategory).reduce((acc, wis) => Math.max(acc, wis.length), 0);
            const totalOfCategories = Object.values(organizedByCategory).reduce((acc, wis) => acc + wis.length, 0);

            return (
              Object.entries(organizedByCategory)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([rcaCategory, wisInCategory]) => {
                  const organizedByReason = organizeWorkItemsByRCAReason(workItemById, wisInCategory.map(wi => wi.id));
                  const maxInReason = Object.values(organizedByReason).reduce((acc, group) => Math.max(acc, group.length), 0);

                  return (
                    <details key={rcaCategory} className="mb-2">
                      <summary className="cursor-pointer">
                        <div
                          style={{ width: 'calc(100% - 20px)' }}
                          className="inline-block relative"
                        >
                          <div
                            style={{
                              width: `${(wisInCategory.length / maxInCategory) * 100}%`,
                              backgroundColor: `${lineColor({ witId, groupName })}99`
                            }}
                            className="absolute top-0 left-0 h-full rounded-md"
                          />
                          <h3
                            className="z-10 relative text-lg pl-2 py-1"
                          >
                            {`${rcaCategory} - `}
                            <strong>
                              {`${wisInCategory.length}`}
                            </strong>
                            {` (${Math.round((wisInCategory.length * 100) / totalOfCategories)}%)`}
                          </h3>
                        </div>
                      </summary>
                      <div className="pl-6">
                        {Object.entries(organizedByReason)
                          .sort(([, a], [, b]) => b.length - a.length)
                          .map(([rcaReason, wisForReason]) => (
                            <details key={rcaReason} className="mt-2">
                              <summary className="cursor-pointer">
                                <div
                                  style={{ width: 'calc(100% - 20px)' }}
                                  className="inline-block relative"
                                >
                                  <div
                                    style={{
                                      width: `${(wisForReason.length / maxInReason) * 100}%`,
                                      backgroundColor: `${lineColor({ witId, groupName })}55`
                                    }}
                                    className="absolute top-0 left-0 h-full rounded-md"
                                  />
                                  <h4 className="z-10 relative text-lg pl-2 py-1">
                                    {`${rcaReason} - `}
                                    <strong>
                                      {`${wisForReason.length}`}
                                    </strong>
                                    {` (${
                                      Math.round((wisForReason.length * 100) / wisInCategory.length)
                                    }%)`}
                                  </h4>
                                </div>
                              </summary>
                              <ul className="pl-6">
                                {wisForReason
                                  .sort((a, b) => (a.priority || 5) - (b.priority || 5))
                                  .map(wi => (
                                    <li key={wi.id} className="py-2">
                                      <WorkItemLinkForModal
                                        workItem={wi}
                                        workItemType={workItemType(witId)}
                                        tooltip={workItemTooltip}
                                        flair={`Priority ${wi.priority || 'unknown'}`}
                                      />
                                    </li>
                                  ))}
                              </ul>
                            </details>
                          ))}
                      </div>
                    </details>
                  );
                })
            );
          }}
        />
      )}
    />
  );
};

type BugLeakageAndRCAGraphProps = {
  allWorkItems: OrganizedWorkItems;
  lastUpdated: string;
  workItemType: (witId: string) => UIWorkItemType;
  workItemById: (wid: number) => UIWorkItem;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
};

const BugLeakageAndRCAGraph: React.FC<BugLeakageAndRCAGraphProps> = ({
  allWorkItems, lastUpdated, workItemType, workItemById, workItemTimes, workItemGroup
}) => {
  const bugs = bugLikeWorkItems(allWorkItems, workItemType);
  const hasLeakedInLastMonth = bugsLeakedInLastMonth(lastUpdated, workItemById);
  const leaked = Object.entries(bugs).reduce<OrganizedWorkItems>((acc, [witId, group]) => {
    acc[witId] = acc[witId] || {};
    Object.entries(group).forEach(([groupName, wids]) => {
      acc[witId][groupName] = wids.filter(hasLeakedInLastMonth);
    });
    return acc;
  }, {});

  return (
    <>
      {Object.entries(leaked).map(([witId, groups]) => (
        <WorkItemCard
          key={witId}
          witId={witId}
          workItemById={workItemById}
          workItemType={workItemType}
          workItemTimes={workItemTimes}
          workItemGroup={workItemGroup}
          groups={groups}
        />
      ))}
    </>
  );
};

export default BugLeakageAndRCAGraph;
