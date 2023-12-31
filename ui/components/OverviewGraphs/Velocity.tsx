import { length, pipe, prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types.js';
import { num, shortDate } from '../../helpers/utils.js';
import type { LineGraphProps } from '../graphs/LineGraph.js';
import LineGraph from '../graphs/LineGraph.js';
import { closedWorkItemsCSV } from './helpers/create-csv-content.js';
import { CrosshairBubble } from './helpers/CrosshairBubble.js';
import type {
  WorkItemLine,
  WorkItemPoint,
} from './helpers/day-wise-line-graph-helpers.js';
import {
  getMatchingAtIndex,
  splitByDateForLineGraph,
} from './helpers/day-wise-line-graph-helpers.js';
import GraphCard from './helpers/GraphCard.js';
import type { WorkItemAccessors } from './helpers/helpers.js';
import {
  stringifyDateField,
  useSidebarCheckboxState,
  lineColor,
  getSidebarStatByKey,
  getSidebarHeadlineStats,
  getSidebarItemStats,
} from './helpers/helpers.js';
import type { LegendSidebarProps } from './helpers/LegendSidebar.js';
import { LegendSidebar } from './helpers/LegendSidebar.js';
import type { ModalArgs } from './helpers/modal-helpers.js';
import { WorkItemsNested, workItemSubheading } from './helpers/modal-helpers.js';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters.js';
import { createCompletedWorkItemTooltip } from './helpers/tooltips.js';

const isClosedToday =
  (dayStart: Date, accessors: WorkItemAccessors) => (workItem: UIWorkItem) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const closedAt = new Date(accessors.workItemTimes(workItem).end!);
    const dateEnd = new Date(dayStart);
    dateEnd.setDate(dayStart.getDate() + 1);
    return closedAt >= dayStart && closedAt < dateEnd;
  };

type VelocityGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const VelocityGraph: React.FC<VelocityGraphProps> = ({
  workItems,
  accessors,
  openModal,
}) => {
  const {
    isWorkItemClosed,
    organizeByWorkItemType,
    workItemType,
    queryPeriodDays,
    groupLabel,
  } = accessors;
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(
    () => () => true
  );
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(
    () => () => true
  );

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(isWorkItemClosed),
    [isWorkItemClosed, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const csvData = useMemo(
    () => closedWorkItemsCSV(preFilteredWorkItems.filter(filter), accessors),
    [preFilteredWorkItems, filter, accessors]
  );

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(preFilteredWorkItems, filter),
    [organizeByWorkItemType, preFilteredWorkItems, filter]
  );

  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(accessors),
    [accessors]
  );

  const dataByDay = useMemo(
    () => splitByDateForLineGraph(accessors, workItemsToDisplay, isClosedToday),
    [accessors, workItemsToDisplay]
  );

  const [onCheckboxClick, isChecked] = useSidebarCheckboxState(workItemsToDisplay);

  const showCrosshairBubble = useCallback(
    (pointIndex: number) => (
      <CrosshairBubble
        data={dataByDay.filter(x => isChecked(x.witId + x.groupName))}
        index={pointIndex}
        title="Velocity"
        itemStat={pipe(length, num)}
        accessors={accessors}
      />
    ),
    [accessors, dataByDay, isChecked]
  );

  const lineGraphProps = useMemo<LineGraphProps<WorkItemLine, WorkItemPoint>>(
    () => ({
      className: 'max-w-full',
      lines: dataByDay.filter(x => isChecked(x.witId + x.groupName)),
      points: prop('workItemPoints'),
      pointToValue: pipe(prop('workItems'), length),
      yAxisLabel: num,
      lineLabel: groupLabel,
      xAxisLabel: pipe(prop('date'), shortDate),
      lineColor,
      crosshairBubble: showCrosshairBubble,
      onClick: pointIndex => {
        const matchingDate = getMatchingAtIndex(dataByDay, pointIndex);

        return openModal({
          heading: 'Velocity',
          subheading: matchingDate.length ? shortDate(matchingDate[0].date) : '',
          body: (
            <WorkItemsNested
              workItems={matchingDate
                .filter(x => x.workItems.length > 0)
                .map(({ groupName, witId, workItems }) => ({
                  heading: {
                    label: accessors.groupLabel({ witId, groupName }),
                    flair: num(workItems.length),
                    flairColor: lineColor({ groupName, witId }),
                  },
                  workItems,
                }))}
              accessors={accessors}
              tooltip={workItemTooltip}
            />
          ),
        });
      },
    }),
    [
      accessors,
      dataByDay,
      groupLabel,
      isChecked,
      openModal,
      showCrosshairBubble,
      workItemTooltip,
    ]
  );

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const items = getSidebarItemStats(
      workItemsToDisplay,
      accessors,
      pipe(length, num),
      isChecked
    );
    const headlineStats = getSidebarHeadlineStats(
      workItemsToDisplay,
      workItemType,
      pipe(length, num),
      'total'
    );

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(
          key,
          workItemsToDisplay
        );
        const daySplitForItem =
          dataByDay.find(item => item.groupName === groupName && item.witId === witId)
            ?.workItemPoints || [];

        return openModal({
          heading: `Velocity over the last ${queryPeriodDays} days`,
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemsNested
              workItems={daySplitForItem
                .filter(x => x.workItems.length > 0)
                .map(({ date, workItems }) => ({
                  heading: {
                    label: shortDate(date),
                    flair: num(workItems.length),
                    flairColor: lineColor({ groupName, witId }),
                  },
                  workItems,
                }))}
              accessors={accessors}
              tooltip={workItemTooltip}
            />
          ),
        });
      },
      onCheckboxClick,
    };
  }, [
    accessors,
    dataByDay,
    isChecked,
    onCheckboxClick,
    openModal,
    queryPeriodDays,
    workItemTooltip,
    workItemsToDisplay,
  ]);

  return (
    <GraphCard
      title="Velocity"
      subtitle={`Work items completed over the last ${queryPeriodDays} days`}
      hasData={preFilteredWorkItems.length > 0}
      csvData={csvData}
      left={
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter
              workItems={preFilteredWorkItems}
              setFilter={setPriorityFilter}
            />
          </div>
          <LineGraph<WorkItemLine, WorkItemPoint> {...lineGraphProps} />
          <ul className="text-sm text-gray-600 pl-8 mt-4 list-disc bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {Object.keys(workItemsToDisplay).map(witId => (
              <li key={witId}>
                {`Completed date for ${workItemType(
                  witId
                ).name[1].toLowerCase()} is the `}
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {`${stringifyDateField(workItemType(witId).endDateFields!)}.`}
              </li>
            ))}
          </ul>
        </>
      }
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default VelocityGraph;
