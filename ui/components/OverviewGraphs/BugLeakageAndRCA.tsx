import { length, not, pipe } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { num } from '../../helpers/utils';
import { DownChevron, UpChevron } from '../common/Icons';
import GraphCard from './helpers/GraphCard';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  noGroup,
  useSidebarCheckboxState,
  lineColor,
  getSidebarStatByKey, getSidebarHeadlineStats, getSidebarItemStats
} from './helpers/helpers';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemLinkForModal, WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createWIPWorkItemTooltip } from './helpers/tooltips';

type GraphItem = {
  rca: string;
  wis: UIWorkItem[];
  color: string;
};

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

const isBugLike = (workItemType: UIWorkItemType) => (
  workItemType.name[0].toLowerCase().includes('bug')
);

const bugsLeakedInLastMonth = (lastUpdated: Date) => {
  const lastMonth = new Date(lastUpdated);
  lastMonth.setDate(lastMonth.getDate() - 30);

  return (wi: UIWorkItem) => {
    if (wi.state.toLowerCase() === 'withdrawn') return false;
    return new Date(wi.created.on) >= lastMonth;
  };
};

const organizeWorkItemsByRCA = (workItems: UIWorkItem[]) => (
  workItems.reduce<Record<string, UIWorkItem[]>>((acc, wi) => {
    const categoryName = wi.rca || 'No RCA provided';
    acc[categoryName] = (acc[categoryName] || []).concat(wi);
    return acc;
  }, {})
);

type BugLeakageGraphBarsProps = {
  witId: string;
  graphData: GraphItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
  workItemTooltip: (workItem: UIWorkItem, additionalSections?: {
    label: string;
    value: string | number;
  }[]) => string;
};

const BugLeakageGraphBars: React.FC<BugLeakageGraphBarsProps> = ({
  witId, graphData, accessors, openModal, workItemTooltip
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const total = useMemo(
    () => graphData.reduce((acc, { wis }) => acc + wis.length, 0),
    [graphData]
  );
  const maxValue = useMemo(
    () => Math.max(...graphData.map(({ wis }) => wis.length)),
    [graphData]
  );
  const { workItemType } = accessors;

  return (
    <>
      <ul>
        {graphData
          .slice(0, isExpanded ? undefined : collapsedCount)
          .map(({ rca, wis, color }) => (
            <li key={rca}>
              <button
                className="grid gap-4 pl-3 my-3 w-full rounded-lg items-center hover:bg-gray-100 cursor-pointer"
                style={{ gridTemplateColumns: '20% 85px 1fr' }}
                onClick={() => openModal({
                  heading: `${workItemType(witId).name[0]} leakage`,
                  subheading: `${rca} (${wis.length})`,
                  body: (
                    <WorkItemFlatList
                      workItemType={workItemType(witId)}
                      workItems={wis.sort((a, b) => (a.priority || 10) - (b.priority || 10))}
                      tooltip={workItemTooltip}
                      flairs={workItem => [`Priority ${workItem.priority || 'unknown'}`]}
                    />
                  )
                })}
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
        <div className="flex justify-end">
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
  );
};

type BugLeakageGraphForModalProps = {
  witId: string;
  groupName: string;
  workItems: UIWorkItem[];
  tooltip: (workItem: UIWorkItem) => string;
  workItemType: UIWorkItemType;
};

const BugLeakageGraphForModal: React.FC<BugLeakageGraphForModalProps> = ({
  witId, groupName, workItems, tooltip, workItemType
}) => {
  const organized = useMemo(
    () => organizeWorkItemsByRCA(workItems),
    [workItems]
  );

  const maxInCategory = useMemo(
    () => Object.values(organized).reduce((acc, wis) => Math.max(acc, wis.length), 0),
    [organized]
  );

  const totalOfCategories = useMemo(
    () => Object.values(organized).reduce((acc, wis) => acc + wis.length, 0),
    [organized]
  );

  return (
    <>
      {Object.entries(organized)
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
                        workItemType={workItemType}
                        tooltip={tooltip(wi)}
                        flairs={[`Priority ${wi.priority || 'unknown'}`]}
                      />
                    </li>
                  ))}
              </ul>
            </div>
          </details>
        ))}
    </>
  );
};

type BugLeakageByWitProps = {
  witId: string;
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const BugLeakageByWit: React.FC<BugLeakageByWitProps> = ({
  witId, workItems, accessors, openModal
}) => {
  const { workItemType, organizeByWorkItemType, workItemGroup } = accessors;
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const organized = useMemo(
    () => organizeByWorkItemType(workItems, filter),
    [filter, organizeByWorkItemType, workItems]
  );

  const [toggle, isChecked] = useSidebarCheckboxState(organized);

  const organizedByRCA = useMemo(
    () => organizeWorkItemsByRCA(workItems.filter(
      x => filter(x) && isChecked(witId + (x.groupId ? workItemGroup(x.groupId).name : noGroup))
    )),
    [filter, isChecked, witId, workItemGroup, workItems]
  );

  const graphData: GraphItem[] = useMemo(() => (
    Object.entries(organizedByRCA)
      .map(([rca, wis]) => ({ rca, wis, color: '#00bcd4' }))
      .filter(({ wis }) => wis.length > 0)
      .sort((a, b) => b.wis.length - a.wis.length)
  ), [organizedByRCA]);

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(accessors),
    [accessors]
  );

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const items = getSidebarItemStats(
      organized, workItemType, pipe(length, num), isChecked
    );

    const headlineStats = getSidebarHeadlineStats(
      organized, workItemType, pipe(length, num), 'total'
    );

    return {
      headlineStats,
      items,
      onCheckboxClick: toggle,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, organized);

        return openModal({
          heading: `${workItemType(witId).name[0]} leakage`,
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <BugLeakageGraphForModal
              workItems={workItems}
              witId={witId}
              groupName={groupName}
              tooltip={workItemTooltip}
              workItemType={workItemType(witId)}
            />
          )
        });
      }
    };
  }, [isChecked, openModal, organized, toggle, workItemTooltip, workItemType]);

  return (
    <GraphCard
      title={`${workItemType(witId).name[0]} leakage with root cause`}
      subtitle={`${workItemType(witId).name[1]} leaked over the last 30 days with their root cause`}
      hasData={workItems.length > 0}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={workItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={workItems} setFilter={setPriorityFilter} />
          </div>
          <BugLeakageGraphBars
            witId={witId}
            accessors={accessors}
            graphData={graphData}
            openModal={openModal}
            workItemTooltip={workItemTooltip}
          />
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

type BugLeakageAndRCAGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const BugLeakageAndRCAGraph: React.FC<BugLeakageAndRCAGraphProps> = ({
  workItems, accessors, openModal
}) => {
  const { workItemType, lastUpdated } = accessors;
  const hasLeakedInLastMonth = bugsLeakedInLastMonth(lastUpdated);

  const witIdAndWorkItems = useMemo(
    () => workItems.reduce<Record<string, UIWorkItem[]>>((acc, wi) => {
      if (isBugLike(workItemType(wi.typeId)) && hasLeakedInLastMonth(wi)) {
        acc[wi.typeId] = acc[wi.typeId] || [];
        acc[wi.typeId].push(wi);
      }
      return acc;
    }, {}),
    [hasLeakedInLastMonth, workItemType, workItems]
  );

  return (
    <>
      {Object.entries(witIdAndWorkItems).map(([witId, workItems]) => (
        <BugLeakageByWit
          key={witId}
          accessors={accessors}
          workItems={workItems}
          openModal={openModal}
          witId={witId}
        />
      ))}
    </>
  );
};

export default BugLeakageAndRCAGraph;
