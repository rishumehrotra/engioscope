import { length, pipe, prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import { num, shortDate } from '../../helpers/utils';
import type { LineGraphProps } from '../graphs/LineGraph';
import LineGraph from '../graphs/LineGraph';
import { CrosshairBubble } from './helpers/CrosshairBubble';
import type { WorkItemLine, WorkItemPoint } from './helpers/day-wise-line-graph-helpers';
import { getMatchingAtIndex, splitByDateForLineGraph } from './helpers/day-wise-line-graph-helpers';
import GraphCard from './helpers/GraphCard';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  stringifyDateField,
  useSidebarCheckboxState,
  lineColor, getSidebarStatByKey, getSidebarHeadlineStats, getSidebarItemStats
} from './helpers/helpers';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemsNested, workItemSubheading } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createWIPWorkItemTooltip } from './helpers/tooltips';

const isOpenedToday = (dayStart: Date, accessors: WorkItemAccessors) => (workItem: UIWorkItem) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const openedOn = new Date(accessors.workItemTimes(workItem).start!);
  const dateEnd = new Date(dayStart);
  dateEnd.setDate(dayStart.getDate() + 1);
  return openedOn >= dayStart && openedOn < dateEnd;
};

const createCSVArray = (workItems: UIWorkItem[], accessors: WorkItemAccessors): (string | number)[][] => ([
  ['ID', 'Type', 'Group', 'Title', 'Created on', 'Started on', 'Priority', 'URL'],
  ...workItems.map(wi => [
    wi.id,
    accessors.workItemType(wi.typeId).name[0],
    wi.groupId ? accessors.workItemGroup(wi.groupId).name : '-',
    wi.title,
    wi.created.on.split('T')[0],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    accessors.workItemTimes(wi).start ? accessors.workItemTimes(wi).start!.split('T')[0] : '-',
    wi.priority || 'unknown',
    wi.url
  ])
]);

type NewGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const NewGraph: React.FC<NewGraphProps> = ({
  workItems, accessors, openModal
}) => {
  const {
    wasWorkItemOpenedThisMonth, organizeByWorkItemType, workItemType,
    isBug, workItemTimes
  } = accessors;
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(wasWorkItemOpenedThisMonth),
    [wasWorkItemOpenedThisMonth, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const csvData = useMemo(() => (
    createCSVArray(preFilteredWorkItems.filter(filter), accessors)
  ), [preFilteredWorkItems, filter, accessors]);

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(preFilteredWorkItems, filter),
    [organizeByWorkItemType, preFilteredWorkItems, filter]
  );

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(accessors),
    [accessors]
  );

  const dataByDay = useMemo(
    () => splitByDateForLineGraph(accessors, workItemsToDisplay, isOpenedToday),
    [accessors, workItemsToDisplay]
  );

  const [onCheckboxClick, isChecked] = useSidebarCheckboxState(workItemsToDisplay);

  const lineGraphProps = useMemo<LineGraphProps<WorkItemLine, WorkItemPoint>>(() => ({
    className: 'max-w-full',
    lines: dataByDay.filter(x => isChecked(x.witId + x.groupName)),
    points: prop('workItemPoints'),
    pointToValue: pipe(prop('workItems'), length),
    yAxisLabel: num,
    lineLabel: accessors.groupLabel,
    xAxisLabel: pipe(prop('date'), shortDate),
    lineColor,
    crosshairBubble: (pointIndex: number) => (
      <CrosshairBubble
        data={dataByDay.filter(x => isChecked(x.witId + x.groupName))}
        index={pointIndex}
        title="New work items"
        itemStat={pipe(length, num)}
        accessors={accessors}
      />
    ),
    onClick: pointIndex => {
      const matchingDate = getMatchingAtIndex(dataByDay, pointIndex);

      return openModal({
        heading: 'New work items',
        subheading: matchingDate.length ? shortDate(matchingDate[0].date) : '',
        body: (
          <WorkItemsNested
            workItems={matchingDate
              .filter(x => x.workItems.length > 0)
              .map(({ groupName, witId, workItems }) => ({
                heading: {
                  label: accessors.groupLabel({ witId, groupName }),
                  flair: num(workItems.length),
                  flairColor: lineColor({ groupName, witId })
                },
                workItems
              }))}
            flairs={wi => [
              isBug(wi.typeId)
                ? shortDate(new Date(wi.created.on))
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                : shortDate(new Date(workItemTimes(wi).start!))
            ]}
            accessors={accessors}
            tooltip={workItemTooltip}
          />
        )
      });
    }
  }), [accessors, dataByDay, isBug, isChecked, openModal, workItemTimes, workItemTooltip]);

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const items = getSidebarItemStats(
      workItemsToDisplay, accessors, pipe(length, num), isChecked
    );
    const headlineStats = getSidebarHeadlineStats(
      workItemsToDisplay, workItemType, pipe(length, num), 'total'
    );

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, workItemsToDisplay);
        const daySplitForItem = dataByDay
          .find(item => item.groupName === groupName && item.witId === witId)
          ?.workItemPoints || [];

        return openModal({
          heading: 'New work items',
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemsNested
              workItems={daySplitForItem
                .filter(x => x.workItems.length > 0)
                .map(({ date, workItems }) => ({
                  heading: {
                    label: shortDate(date),
                    flair: num(workItems.length),
                    flairColor: lineColor({ groupName, witId })
                  },
                  workItems
                }))}
              flairs={wi => [
                isBug(wi.typeId)
                  ? shortDate(new Date(wi.created.on))
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  : shortDate(new Date(workItemTimes(wi).start!))
              ]}
              accessors={accessors}
              tooltip={workItemTooltip}
            />
          )
        });
      },
      onCheckboxClick
    };
  }, [accessors, dataByDay, isBug, isChecked, onCheckboxClick, openModal, workItemTimes, workItemTooltip, workItemsToDisplay]);

  return (
    <GraphCard
      title="New work items"
      subtitle="Work items on which work started this month"
      hasData={preFilteredWorkItems.length > 0}
      renderLazily={false}
      downloadContents={csvData}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} />
          </div>
          <LineGraph<WorkItemLine, WorkItemPoint> {...lineGraphProps} />
          <ul className="text-sm text-gray-600 pl-8 mt-4 list-disc bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {Object.keys(workItemsToDisplay).map(witId => (
              <li key={witId}>
                {`A ${workItemType(witId).name[0].toLowerCase()} is considered opened if it has a `}
                {`${
                  isBug(witId)
                    ? 'created date'
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    : stringifyDateField(workItemType(witId).startDateFields!)
                } within the last 30 days.`}
              </li>
            ))}
          </ul>
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default NewGraph;
