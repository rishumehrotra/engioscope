import { prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import type { ScatterLineGraphProps } from '../graphs/ScatterLineGraph';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import type { LegendSidebarProps } from './LegendSidebar';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import { prettyMS, priorityBasedColor } from '../../helpers/utils';
import type { WorkItemAccessors } from './helpers';
import { getSidebarStatByKey, getSidebarItemStats, getSidebarHeadlineStats } from './helpers';
import { createCompletedWorkItemTooltip } from './tooltips';
import { PriorityFilter, SizeFilter } from './MultiSelectFilters';
import type { ModalArgs } from './modal-helpers';
import { WorkItemFlatList, workItemSubheading } from './modal-helpers';
import { WorkItemTimeDetails } from './WorkItemTimeDetails';

type CycleTimeGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

export const CycleTimeGraph: React.FC<CycleTimeGraphProps> = ({ workItems, accessors, openModal }) => {
  const {
    isWorkItemClosed, organizeByWorkItemType, workItemTimes,
    workItemType, cycleTime: cTime
  } = accessors;

  const cycleTime = useCallback(
    // In this component, cycleTime will always be non-null
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (workItem: UIWorkItem) => cTime(workItem)!,
    [cTime]
  );

  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const preFilteredWorkItems = useMemo(
    () => workItems
      .filter(isWorkItemClosed)
      .filter(workItem => {
        const wiTimes = workItemTimes(workItem);
        return wiTimes.start && wiTimes.end;
      }),
    [isWorkItemClosed, workItemTimes, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(accessors),
    [accessors]
  );

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(preFilteredWorkItems, filter),
    [organizeByWorkItemType, preFilteredWorkItems, filter]
  );

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const {
      totalCycleTime, workItemTimes, workItemType
    } = accessors;

    const aggregator = (workItems: UIWorkItem[]) => (
      workItems.length ? prettyMS(totalCycleTime(workItems) / workItems.length) : '-'
    );
    const items = getSidebarItemStats(workItemsToDisplay, workItemType, aggregator);
    const headlineStats = getSidebarHeadlineStats(workItemsToDisplay, workItemType, aggregator, 'avg');

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, workItemsToDisplay);

        return openModal({
          heading: 'Cycle time',
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemFlatList
              workItems={(
                workItems.sort((a, b) => cycleTime(b) - cycleTime(a))
              )}
              workItemType={workItemType(witId)}
              tooltip={workItemTooltip}
              flairs={workItem => [prettyMS(cycleTime(workItem))]}
              extra={workItem => (
                <WorkItemTimeDetails
                  workItem={workItem}
                  workItemTimes={workItemTimes}
                />
              )}
            />
          )
        });
      }
    };
  }, [accessors, cycleTime, openModal, workItemTooltip, workItemsToDisplay]);

  const graphWidthRatio = useMemo(
    () => Object.values(workItemsToDisplay)
      .map(x => `${Object.values(x).length}fr`)
      .join(' '),
    [workItemsToDisplay]
  );

  const scatterLineGraphProps = useMemo(
    () => Object.entries(workItemsToDisplay).map<ScatterLineGraphProps<UIWorkItem>>(
      ([witId, group]) => ({
        key: witId,
        graphData: [{
          label: workItemType(witId).name[1],
          data: group,
          yAxisPoint: (workItem: UIWorkItem) => cycleTime(workItem),
          tooltip: wi => workItemTooltip(wi)
        }],
        pointColor: workItem => (workItem.priority ? priorityBasedColor(workItem.priority) : undefined),
        height: 420,
        linkForItem: prop('url'),
        className: 'w-full'
      })
    ),
    [cycleTime, workItemTooltip, workItemType, workItemsToDisplay]
  );

  return (
    <GraphCard
      title="Cycle time"
      subtitle="Time taken to complete a work item"
      hasData={preFilteredWorkItems.length > 0}
      noDataMessage="Couldn't find any matching work items"
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} />
          </div>
          <div
            className="grid gap-4 justify-between items-center grid-cols-2"
            style={{ gridTemplateColumns: graphWidthRatio }}
          >
            {scatterLineGraphProps.map(props => <ScatterLineGraph {...props} />)}
          </div>
        </>
      )}
      right={(
        <LegendSidebar {...legendSidebarProps} />
      )}
    />
  );
};
