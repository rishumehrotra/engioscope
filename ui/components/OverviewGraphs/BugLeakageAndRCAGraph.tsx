import { length, not, pipe } from 'rambda';
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
import { DownChevron, UpChevron } from '../common/Icons';
import usePriorityFilter from './use-priority-filter';
import useSizeFilter from './use-size-filter';

const collapsedCount = 10;

const barTooltip = (rca: string, workItems: UIWorkItem[]) => {
  const statuses = Object.entries(
    workItems
      .reduce<Record<string, number>>((acc, wi) => {
        acc[wi.state] = (acc[wi.state] || 0) + 1;
        return acc;
      }, {})
  ).map(([status, count]) => `${status} (${count})`);

  const priorities = Object.entries(
    workItems
      .reduce<Record<string, number>>((acc, wi) => {
        const priority = wi.priority || 'Unprioritised';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {})
  )
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([priority, count]) => `${priority} (${count})`);

  return `
    <div class="w-80">
      <div class="font-bold mb-2">${rca}</div>
      <dl>
        ${statuses.length ? `
          <dt class="font-bold mt-2">States:</dt>
          <dd class="ml-4">
            ${statuses.join(', ')}
          </dd>
        ` : ''}
        ${priorities.length ? `
          <dt class="font-bold mt-2">Priorities:</dt>
          <dd class="ml-4">
            ${priorities.join(', ')}
          </dd>
        ` : ''}
      </dl>
    </div>
  `;
};

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

const organizeWorkItemsByRCA = (workItemById: (wid: number) => UIWorkItem, wids: number[]) => (
  wids.reduce<Record<string, UIWorkItem[]>>((acc, wid) => {
    const wi = workItemById(wid);
    const categoryName = wi.rca || 'No RCA provided';
    acc[categoryName] = (acc[categoryName] || []).concat(wi);
    return acc;
  }, {})
);

const initialCheckboxState = (groups: Record<string, number[]>) => (
  Object.keys(groups)
    .reduce<Record<string, boolean>>((acc, groupName) => {
      acc[groupName] = true;
      return acc;
    }, {})
);

const applyFilter = (priorityState: string[]) => (
  (wi: UIWorkItem) => {
    if (priorityState.length === 0) { return true; }
    if (!wi.priority) { return false; }
    return priorityState.includes(String(wi.priority));
  }
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
  const [selectedCheckboxes, setSelectedCheckboxes] = useState(initialCheckboxState(groups));
  const [isExpanded, setIsExpanded] = useState(false);

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(workItemType, workItemTimes, workItemGroup),
    [workItemGroup, workItemTimes, workItemType]
  );

  const [priorities, priorityState, setPriorityState, priorityFilteredData] = usePriorityFilter(
    { [witId]: groups }, workItemById
  );
  const [sizes, sizeState, setSizeState, dataToShow] = useSizeFilter(priorityFilteredData, workItemById);

  const organizedByRCA = useMemo(() => (
    organizeWorkItemsByRCA(
      workItemById,
      Object.entries(dataToShow[witId]).reduce<number[]>((acc, [groupName, wids]) => {
        if (selectedCheckboxes[groupName]) acc.push(...wids);
        return acc;
      }, [])
    )
  ), [dataToShow, selectedCheckboxes, witId, workItemById]);

  const graphData = useMemo(() => (
    Object.entries(organizedByRCA)
      .map(([rca, wis]) => ({ rca, wis, color: '#00bcd4' }))
      .filter(({ wis }) => wis.length > 0)
      .sort((a, b) => b.wis.length - a.wis.length)
  ), [organizedByRCA]);

  useEffect(() => setSelectedCheckboxes(initialCheckboxState(groups)), [groups]);

  const total = graphData.reduce((acc, { wis }) => acc + wis.length, 0);
  const maxValue = Math.max(...graphData.map(({ wis }) => wis.length));

  return (
    <GraphCard
      title={`${workItemType(witId).name[0]} leakage with root cause`}
      subtitle={`${workItemType(witId).name[1]} leaked over the last 30 days with their root cause`}
      hasData={hasWorkItems({ [witId]: groups })}
      noDataMessage="Couldn't find any matching workitems"
      left={(
        <>
          <Modal
            heading={modalBar
              ? modalHeading('Bug leakage', `${modalBar.label} (${organizedByRCA[modalBar.label].length})`)
              : ''}
            {...modalProps}
          >
            {(() => {
              if (!modalBar) return 'Nothing to see here';

              return (
                <ul>
                  {organizedByRCA[modalBar.label]
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
              );
            })()}
          </Modal>

          {(priorities.length > 1 || sizes.length > 1) && (
            <div className="flex justify-end mb-8 mr-4 gap-2">
              {sizes.length > 1 && (
                <MultiSelectDropdownWithLabel
                  name="size"
                  label="Size"
                  options={sizes}
                  onChange={setSizeState}
                  value={sizeState}
                  className="w-80 text-sm"
                />
              )}
              {priorities.length > 1 && (
                <MultiSelectDropdownWithLabel
                  name="priority"
                  label="Priority"
                  options={priorities}
                  onChange={setPriorityState}
                  value={priorityState}
                  className="w-48 text-sm"
                />
              )}
            </div>
          )}
          <ul>
            {graphData
              .slice(0, isExpanded ? undefined : collapsedCount)
              .map(({ rca, wis, color }) => (
                <li key={rca} className="mr-4">
                  <button
                    className="grid gap-4 pl-3 my-3 w-full rounded-lg items-center hover:bg-gray-100 cursor-pointer"
                    style={{ gridTemplateColumns: '20% 85px 1fr' }}
                    onClick={() => {
                      setModalBar({ label: rca, color });
                      open();
                    }}
                    data-tip={barTooltip(rca, wis)}
                    data-html
                  >
                    <div className="flex items-center justify-end">
                      <span className="truncate">
                        {rca}
                      </span>
                    </div>
                    <span className="justify-self-end">
                      {`${wis.length} (${Math.round((wis.length * 100) / total)}%)`}
                    </span>
                    <div className="bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="rounded-md"
                        style={{
                          width: `${(wis.length * 100) / maxValue}%`,
                          backgroundColor: color,
                          height: '30px'
                        }}
                      />
                    </div>
                  </button>
                </li>
              ))}
          </ul>
          {graphData.length > collapsedCount && (
            <div className="flex justify-end mr-4">
              <button
                className="text-blue-700 text-sm flex items-center hover:text-blue-900 hover:underline"
                onClick={() => setIsExpanded(not)}
              >
                {isExpanded ? <UpChevron className="w-4 mr-1" /> : <DownChevron className="w-4 mr-1" />}
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}
      right={(
        <LegendSidebar
          data={{
            [witId]: Object.entries(groups)
              .reduce<OrganizedWorkItems[string]>(
                (acc, [groupName, wids]) => {
                  acc[groupName] = wids.filter(pipe(workItemById, applyFilter(priorityState)));
                  return acc;
                },
                {}
              )
          }}
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
              selectedCheckboxes => ({
                ...selectedCheckboxes,
                [groupName]: !selectedCheckboxes[groupName]
              })
            )
          )}
          modalContents={({ workItemIds, groupName }) => {
            const organized = organizeWorkItemsByRCA(
              workItemById,
              workItemIds.filter(pipe(workItemById, applyFilter(priorityState)))
            );

            const maxInCategory = Object.values(organized)
              .reduce((acc, wis) => Math.max(acc, wis.length), 0);

            const totalOfCategories = Object.values(organized)
              .reduce((acc, wis) => acc + wis.length, 0);

            return (
              Object.entries(organized)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([rcaCategory, wisInCategory]) => (
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
                      <ul className="pl-6">
                        {wisInCategory
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
                    </div>
                  </details>
                ))
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
