import { length, pipe, prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import { num, shortDate } from '../../helpers/utils';
import type { LineGraphProps } from '../graphs/LineGraph';
import LineGraph from '../graphs/LineGraph';
import { CrosshairBubble } from './CrosshairBubble';
import type { WorkItemLine, WorkItemPoint } from './day-wise-line-graph-helpers';
import { getMatchingAtIndex, splitByDateForLineGraph } from './day-wise-line-graph-helpers';
import GraphCard from './GraphCard';
import type { WorkItemAccessors } from './helpers';
import {
  lineColor, getSidebarStatByKey, getSidebarHeadlineStats, getSidebarItemStats
} from './helpers';
import type { LegendSidebarProps } from './LegendSidebar';
import { LegendSidebar } from './LegendSidebar';
import type { ModalArgs } from './modal-helpers';
import { WorkItemsNested, workItemSubheading } from './modal-helpers';
import { PriorityFilter, SizeFilter } from './MultiSelectFilters';
import { createCompletedWorkItemTooltip } from './tooltips';

const isClosedToday = (workItem: UIWorkItem, dayStart: Date, accessors: WorkItemAccessors) => {
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
  workItems, accessors, openModal
}) => {
  const { isWorkItemClosed, organizeByWorkItemType } = accessors;
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(isWorkItemClosed),
    [isWorkItemClosed, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
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

  const lineGraphProps = useMemo<LineGraphProps<WorkItemLine, WorkItemPoint>>(() => ({
    className: 'max-w-full',
    lines: dataByDay,
    points: prop('workItemPoints'),
    pointToValue: pipe(prop('workItems'), length),
    yAxisLabel: num,
    lineLabel: accessors.groupLabel,
    xAxisLabel: pipe(prop('date'), shortDate),
    lineColor,
    crosshairBubble: (pointIndex: number) => (
      <CrosshairBubble
        data={dataByDay}
        index={pointIndex}
        title="Velocity"
        itemStat={pipe(length, num)}
        accessors={accessors}
      />
    ),
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
                  flairColor: lineColor({ groupName, witId })
                },
                workItems
              }))}
            accessors={accessors}
            tooltip={workItemTooltip}
          />
        )
      });
    }
  }), [accessors, dataByDay, openModal, workItemTooltip]);

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const items = getSidebarItemStats(workItemsToDisplay, workItemType, pipe(length, num));
    const headlineStats = getSidebarHeadlineStats(workItemsToDisplay, workItemType, pipe(length, num), 'avg');

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, workItemsToDisplay);
        const daySplitForItem = dataByDay
          .find(item => item.groupName === groupName && item.witId === witId)
          ?.workItemPoints || [];

        return openModal({
          heading: 'Velocity over the last 30 days',
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
              accessors={accessors}
              tooltip={workItemTooltip}
            />
          )
        });
      }
    };
  }, [accessors, dataByDay, openModal, workItemTooltip, workItemsToDisplay]);

  return (
    <GraphCard
      title="Velocity"
      subtitle="Work items completed over the last 30 days"
      hasData={workItems.length > 0}
      noDataMessage="Couldn't find any work items"
      renderLazily={false}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} />
          </div>
          <LineGraph<WorkItemLine, WorkItemPoint> {...lineGraphProps} />
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default VelocityGraph;
