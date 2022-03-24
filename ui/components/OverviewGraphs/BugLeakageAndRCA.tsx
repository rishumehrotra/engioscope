import { length, not, pipe } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import { count, incrementBy } from '../../../shared/reducer-utils';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { noRCAValue } from '../../../shared/work-item-utils';
import { num } from '../../helpers/utils';
import { DownChevron, UpChevron } from '../common/Icons';
import Switcher from '../common/Switcher';
import ExpandableBarGraph from '../graphs/ExpandableBarGraph';
import GraphCard from './helpers/GraphCard';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  listFormat, noGroup, useSidebarCheckboxState, lineColor,
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

const organizeWorkItemsByRCA = (workItems: UIWorkItem[], rcaFieldIndex: number, emptyValue: string) => {
  const fieldName = (wi: UIWorkItem) => (
    // eslint-disable-next-line no-nested-ternary
    wi.rca.length === 0
      ? 'No RCA available'
      : (wi.rca[rcaFieldIndex] === noRCAValue ? emptyValue : wi.rca[rcaFieldIndex])
  );

  return (
    workItems.reduce<Record<string, UIWorkItem[]>>((acc, wi) => {
      acc[fieldName(wi)] = (acc[fieldName(wi)] || []).concat(wi);
      return acc;
    }, {})
  );
};

type BugLeakageGraphBarsProps = {
  witId: string;
  graphData: GraphItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
  workItemTooltip: (workItem: UIWorkItem, additionalSections?: {
    label: string;
    value: string | number;
  }[]) => string;
  selectedSwitcherIndex: number;
};

const BugLeakageGraphBars: React.FC<BugLeakageGraphBarsProps> = ({
  witId, graphData, accessors, openModal, workItemTooltip, selectedSwitcherIndex
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
                      flairs={workItem => [
                        `Priority ${workItem.priority || 'unknown'}`,
                        ...(
                          (workItemType(witId).rootCauseFields || [])
                            ?.map((f, index) => `${f}: ${workItem.rca[index] || `No ${f} provided`}`)
                            .filter((f, index) => index !== selectedSwitcherIndex)
                        )
                      ]}
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
                  <b>{`${Math.round((wis.length * 100) / total)}%`}</b>
                  <span className="text-sm text-gray-500">{` (${wis.length})`}</span>
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
  const [selectedSwitcherIndex, setSelectedSwitcherIndex] = useState<number>(
    (workItemType.rootCauseFields || []).length - 1
  );

  const organized = useMemo(
    () => organizeWorkItemsByRCA(
      workItems,
      selectedSwitcherIndex,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      `No ${workItemType.rootCauseFields![selectedSwitcherIndex]} provided`
    ),
    [selectedSwitcherIndex, workItemType.rootCauseFields, workItems]
  );

  const totalOfCategories = useMemo(
    () => count(incrementBy(length))(Object.values(organized)),
    [organized]
  );

  const barGraphData = useMemo(
    () => Object.entries(organized)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([rcaCategory, wisInCategory]) => ({
        key: rcaCategory,
        heading: (
          <>
            {`${rcaCategory} - `}
            <strong>
              {`${wisInCategory.length}`}
            </strong>
            {` (${Math.round((wisInCategory.length * 100) / totalOfCategories)}%)`}
          </>
        ),
        value: wisInCategory.length,
        barColor: `${lineColor({ witId, groupName })}99`,
        children: (
          <ul>
            {wisInCategory
              .sort((a, b) => (a.priority || 5) - (b.priority || 5))
              .map(wi => (
                <li key={wi.id} className="py-2">
                  <WorkItemLinkForModal
                    workItem={wi}
                    workItemType={workItemType}
                    tooltip={tooltip(wi)}
                    flairs={[
                      `Priority ${wi.priority || 'unknown'}`,
                      ...(
                        (workItemType.rootCauseFields || [])
                          ?.map((f, index) => `${f}: ${wi.rca[index] || `No ${f} provided`}`)
                          .filter((f, index) => index !== selectedSwitcherIndex)
                      )
                    ]}
                  />
                </li>
              ))}
          </ul>
        )
      })),
    [groupName, organized, selectedSwitcherIndex, tooltip, totalOfCategories, witId, workItemType]
  );

  return (
    <>
      {(workItemType.rootCauseFields?.length || 0) > 1 && (
        <div className="text-right mb-4">
          <Switcher<number>
            options={(workItemType.rootCauseFields || []).map((rca, index) => ({
              label: rca,
              value: index
            }))}
            value={selectedSwitcherIndex}
            onChange={setSelectedSwitcherIndex}
          />
        </div>
      )}
      <ExpandableBarGraph data={barGraphData} />
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
  const [selectedSwitcherIndex, setSelectedSwitcherIndex] = useState((workItemType(witId).rootCauseFields || []).length - 1);

  const organized = useMemo(
    () => organizeByWorkItemType(workItems, filter),
    [filter, organizeByWorkItemType, workItems]
  );

  const [toggle, isChecked] = useSidebarCheckboxState(organized);

  const isRCAMissing = useMemo(
    () => workItems.every(wi => wi.rca.length === 0),
    [workItems]
  );

  const organizedByRCA = useMemo(
    () => organizeWorkItemsByRCA(
      workItems.filter(
        x => filter(x) && isChecked(witId + (x.groupId ? workItemGroup(x.groupId).name : noGroup))
      ),
      selectedSwitcherIndex,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      `No ${workItemType(witId).rootCauseFields![selectedSwitcherIndex]} provided`
    ),
    [filter, isChecked, selectedSwitcherIndex, witId, workItemGroup, workItemType, workItems]
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
          <div className="grid grid-cols-2 justify-between">
            <div className="pt-5">
              {isRCAMissing ? null : (
                <Switcher<number>
                  options={(workItemType(witId).rootCauseFields || []).map((rca, index) => ({
                    label: rca,
                    value: index
                  }))}
                  value={selectedSwitcherIndex}
                  onChange={setSelectedSwitcherIndex}
                />
              )}
            </div>
            <div className="flex justify-end mb-8 gap-2">
              <SizeFilter workItems={workItems} setFilter={setSizeFilter} />
              <PriorityFilter workItems={workItems} setFilter={setPriorityFilter} />
            </div>
          </div>
          {isRCAMissing
            ? (
              <div className="text-gray-500 italic">
                {`${workItemType(witId).name[1]} don't have RCAs.`}
              </div>
            )
            : (
              <>
                <BugLeakageGraphBars
                  witId={witId}
                  accessors={accessors}
                  graphData={graphData}
                  openModal={openModal}
                  workItemTooltip={workItemTooltip}
                  selectedSwitcherIndex={selectedSwitcherIndex}
                />
                <div className="text-sm text-gray-600 mt-4 list-disc bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
                  {`The root cause for a ${workItemType(witId).name[0].toLowerCase()} is determined from the`}
                  {' '}
                  {listFormat(
                    (workItemType(witId).rootCauseFields || []).map(x => `'${x}'`)
                  )}
                  {' '}
                  {(workItemType(witId).rootCauseFields || []).length === 1 ? 'field.' : 'fields.'}
                </div>
              </>
            )}
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
