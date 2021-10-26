import { length } from 'rambda';
import React from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import HorizontalBarGraph from '../graphs/HorizontalBarGraph';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import GraphCard from './GraphCard';
import type { OrganizedWorkItems } from './helpers';
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

type WorkItemCardProps = {
  witId: string;
  workItemById: (wid: number) => UIWorkItem;
  workItemType: (witId: string) => UIWorkItemType;
  groups: OrganizedWorkItems[string];
};

const WorkItemCard: React.FC<WorkItemCardProps> = ({
  witId, workItemById, workItemType, groups
}) => {
  const [selectedCheckboxes, setSelectedCheckboxes] = React.useState<Record<string, boolean>>(
    Object.keys(groups).reduce<Record<string, boolean>>((acc, groupName) => {
      acc[groupName] = true;
      return acc;
    }, {})
  );

  return (
    <GraphCard
      title={`${workItemType(witId).name[0]} leakage and root cause`}
      subtitle={`${workItemType(witId).name[1]} leaked over the last 30 days and their root cause`}
      left={(
        <HorizontalBarGraph
          graphData={
            Object.entries(
              organizeWorkItemsByRCACategory(
                workItemById,
                Object.entries(groups).reduce<number[]>((acc, [groupName, wids]) => {
                  if (selectedCheckboxes[groupName]) acc.push(...wids);
                  return acc;
                }, [])
              )
            )
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([rcaCategory, wids]) => ({
                label: rcaCategory,
                value: wids.length,
                color: '#00bcd4'
              }))
          }
          width={1023}
          formatValue={String}
        />
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
            const maxInCategory = Object.values(organizedByCategory).reduce((acc, group) => Math.max(acc, group.length), 0);

            return (
              Object.entries(organizedByCategory)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([rcaCategory, wis]) => {
                  const organizedByReason = organizeWorkItemsByRCAReason(workItemById, wis.map(wi => wi.id));
                  const maxInReason = Object.values(organizedByReason).reduce((acc, group) => Math.max(acc, group.length), 0);

                  return (
                    <details key={rcaCategory} className="mb-2">
                      <summary className="cursor-pointer">
                        <div
                          style={{ width: 'calc(100% - 20px)' }}
                          className="inline-block relative"
                        >
                          <div
                            style={{ width: `${(wis.length / maxInCategory) * 100}%` }}
                            className="absolute top-0 left-0 h-full bg-blue-600 bg-opacity-50"
                          />
                          <h3
                            className="z-10 relative text-lg pl-2"
                          >
                            {`${rcaCategory}: ${wis.length}`}
                          </h3>
                        </div>
                      </summary>
                      <div className="pl-6">
                        {Object.entries(organizedByReason)
                          .sort(([, a], [, b]) => b.length - a.length)
                          .map(([rcaReason, wis]) => (
                            <details key={rcaReason} className="mt-2">
                              <summary className="cursor-pointer">
                                <div className="w-11/12 inline-block relative">
                                  <div
                                    style={{ width: `${(wis.length / maxInReason) * 100}%` }}
                                    className="absolute top-0 left-0 h-full bg-yellow-600 bg-opacity-50"
                                  />
                                  <h4 className="inline text-lg pl-2">{`${rcaReason}: ${wis.length}`}</h4>
                                </div>
                              </summary>
                              <ul className="pl-6">
                                {wis.map(wi => (
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
