import { length } from 'rambda';
import React, { useEffect, useMemo, useState } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { modalHeading, useModal } from '../common/Modal';
import HorizontalBarGraph from '../graphs/HorizontalBarGraph';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import GraphCard from './GraphCard';
import type { OrganizedWorkItems } from './helpers';
import { hasWorkItems } from './helpers';
import { LegendSidebar } from './LegendSidebar';

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
  groups: OrganizedWorkItems[string];
};

const WorkItemCard: React.FC<WorkItemCardProps> = ({
  witId, workItemById, workItemType, groups
}) => {
  const [Modal, modalProps, open] = useModal();
  const [modalBar, setModalBar] = useState<{label: string; color: string} | null>(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = React.useState(initialCheckboxState(groups));

  const organizedByRCACategory = useMemo(() => (
    organizeWorkItemsByRCACategory(
      workItemById,
      Object.entries(groups).reduce<number[]>((acc, [groupName, wids]) => {
        if (selectedCheckboxes[groupName]) acc.push(...wids);
        return acc;
      }, [])
    )
  ), [groups, selectedCheckboxes, workItemById]);

  const graphData = useMemo(() => (
    Object.entries(organizedByRCACategory)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([rcaCategory, wids]) => ({
        label: rcaCategory,
        value: wids.length,
        color: '#00bcd4'
      }))
  ), [organizedByRCACategory]);

  useEffect(() => setSelectedCheckboxes(initialCheckboxState(groups)), [groups]);

  const total = graphData.reduce((acc, { value }) => acc + value, 0);

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
              ? modalHeading('Bug leakage', `${modalBar.label} (${(organizedByRCACategory[modalBar.label] || []).length})`)
              : ''}
            {...modalProps}
          >
            {(() => {
              if (!modalBar) return 'Nothing to see here';

              const organizedByReason = organizeWorkItemsByRCAReason(
                workItemById,
                (organizedByRCACategory[modalBar.label] || []).map(wi => wi.id)
              );

              const maxBarValue = Math.max(...Object.values(organizedByReason).map(length));
              const total = Object.values(organizedByReason).reduce((acc, wids) => acc + wids.length, 0);

              return Object.entries(organizedByReason)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([rcaReason, wis]) => (
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
                              flair={`Priority ${wi.priority || 'unknown'}`}
                            />
                          </li>
                        ))}
                    </ul>
                  </details>
                ));
            })()}
          </Modal>
          <HorizontalBarGraph
            graphData={graphData}
            width={1023}
            className="w-full"
            formatValue={value => `${value} (${Math.round((value * 100) / total)}%)`}
            onBarClick={({ label, color }) => {
              setModalBar({ label, color });
              open();
            }}
          />
        </>
      )}
      right={(
        <LegendSidebar
          data={{ [witId]: groups }}
          childStat={length}
          heading={`${workItemType(witId).name[1]} leaked`}
          workItemType={workItemType}
          headlineStats={x => ([{
            heading: `Total ${workItemType(witId).name[1].toLowerCase()} leaked`,
            value: Object.values(x).reduce((acc, group) => (
              acc + Object.values(group).reduce((acc2, wids) => acc2 + wids.length, 0)
            ), 0)
          }])}
          isCheckboxChecked={({ groupName }) => selectedCheckboxes[groupName]}
          onCheckboxChange={({ groupName }) => (
            setSelectedCheckboxes(
              selectedCheckboxes => ({ ...selectedCheckboxes, [groupName]: !selectedCheckboxes[groupName] })
            )
          )}
          modalContents={({ workItemIds }) => {
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
                            style={{ width: `${(wisInCategory.length / maxInCategory) * 100}%` }}
                            className="absolute top-0 left-0 h-full bg-blue-600 bg-opacity-50 rounded-md"
                          />
                          <h3
                            className="z-10 relative text-lg pl-2 py-1"
                          >
                            {`${rcaCategory}: ${wisInCategory.length} (${Math.round((wisInCategory.length * 100) / totalOfCategories)}%)`}
                          </h3>
                        </div>
                      </summary>
                      <div className="pl-6">
                        {Object.entries(organizedByReason)
                          .sort(([, a], [, b]) => b.length - a.length)
                          .map(([rcaReason, wisForReason]) => (
                            <details key={rcaReason} className="mt-2">
                              <summary className="cursor-pointer">
                                <div className="w-11/12 inline-block relative">
                                  <div
                                    style={{ width: `${(wisForReason.length / maxInReason) * 100}%` }}
                                    className="absolute top-0 left-0 h-full bg-yellow-600 bg-opacity-50 rounded-md"
                                  />
                                  <h4 className="inline text-lg pl-2">
                                    {`${rcaReason}: ${wisForReason.length} (${
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
};

const BugLeakageAndRCAGraph: React.FC<BugLeakageAndRCAGraphProps> = ({
  allWorkItems, lastUpdated, workItemType, workItemById
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
          groups={groups}
        />
      ))}
    </>
  );
};

export default BugLeakageAndRCAGraph;
