import { prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import type { ScatterLineGraphProps } from '../graphs/ScatterLineGraph';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import GraphCard from './helpers/GraphCard';
import { prettyMS, priorityBasedColor } from '../../helpers/utils';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  stringifyDateField, getSidebarStatByKey, getSidebarItemStats, getSidebarHeadlineStats
} from './helpers/helpers';
import { createCompletedWorkItemTooltip } from './helpers/tooltips';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers';
import { WorkItemTimeDetails } from './helpers/WorkItemTimeDetails';

type CycleTimeGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

export const CycleTimeGraph: React.FC<CycleTimeGraphProps> = ({ workItems, accessors, openModal }) => {
  const {
    isWorkItemClosed, organizeByWorkItemType, workItemType, cycleTime: cTime
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
    () => workItems.filter(isWorkItemClosed),
    [isWorkItemClosed, workItems]
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
      .map(x => `${Object.values(x).length + 1}fr`)
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
          yAxisPoint: cycleTime,
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
          <ul className="text-sm text-gray-600 pl-8 mt-4 list-disc bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {Object.keys(workItemsToDisplay).map(witId => (
              <li>
                {`Cycle time for ${workItemType(witId).name[1].toLowerCase()} is computed from `}
                {`'${stringifyDateField(workItemType(witId).startDateFields!)}'`}
                {` to '${stringifyDateField(workItemType(witId).endDateFields!)}'.`}
              </li>
            ))}
          </ul>
        </>
      )}
      right={(
        <LegendSidebar {...legendSidebarProps} />
      )}
    />
  );
};
