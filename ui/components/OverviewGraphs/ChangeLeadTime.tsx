import { prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types.js';
import type { ScatterLineGraphProps } from '../graphs/ScatterLineGraph.js';
import ScatterLineGraph from '../graphs/ScatterLineGraph.js';
import type { LegendSidebarProps } from './helpers/LegendSidebar.js';
import { LegendSidebar } from './helpers/LegendSidebar.js';
import GraphCard from './helpers/GraphCard.js';
import { prettyMS, priorityBasedColor } from '../../helpers/utils.js';
import type { WorkItemAccessors } from './helpers/helpers.js';
import {
  stringifyDateField, getSidebarStatByKey, getSidebarItemStats, getSidebarHeadlineStats
} from './helpers/helpers.js';
import { createCompletedWorkItemTooltip } from './helpers/tooltips.js';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters.js';
import type { ModalArgs } from './helpers/modal-helpers.js';
import { WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers.js';
import { WorkItemTimeDetails } from './helpers/WorkItemTimeDetails.js';
import { closedWorkItemsCSV } from './helpers/create-csv-content.js';
import { byNum, desc } from '../../../shared/sort-utils.js';

type ChangeLeadTimeGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

export const ChangeLeadTimeGraph: React.FC<ChangeLeadTimeGraphProps> = ({ workItems, accessors, openModal }) => {
  const {
    isWorkItemClosed, organizeByWorkItemType, workItemType, workItemTimes,
    sortByEnvironment
  } = accessors;

  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(wi => isWorkItemClosed(wi) && workItemTimes(wi).devComplete),
    [isWorkItemClosed, workItemTimes, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const csvData = useMemo(() => (
    closedWorkItemsCSV(preFilteredWorkItems.filter(filter), accessors)
  ), [preFilteredWorkItems, filter, accessors]);

  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(accessors),
    [accessors]
  );

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(preFilteredWorkItems, filter),
    [organizeByWorkItemType, preFilteredWorkItems, filter]
  );

  const clt = useCallback(
    (workItem: UIWorkItem) => {
      const times = workItemTimes(workItem);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return new Date(times.end!).getTime() - new Date(times.devComplete!).getTime();
    },
    [workItemTimes]
  );

  const totalClt = useCallback(
    (workItems: UIWorkItem[]) => workItems.reduce(
      (acc, workItem) => acc + clt(workItem),
      0
    ),
    [clt]
  );

  const showWorkItemTimeDetails = useCallback((workItem: UIWorkItem) => (
    <WorkItemTimeDetails
      workItem={workItem}
      workItemTimes={workItemTimes}
    />
  ), [workItemTimes]);

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const aggregator = (workItems: UIWorkItem[]) => (
      workItems.length ? prettyMS(totalClt(workItems) / workItems.length) : '-'
    );
    const items = getSidebarItemStats(workItemsToDisplay, accessors, aggregator);
    const headlineStats = getSidebarHeadlineStats(workItemsToDisplay, workItemType, aggregator, 'avg');

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, workItemsToDisplay);

        return openModal({
          heading: 'Change lead time',
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemFlatList
              workItems={workItems.sort(desc(byNum(clt)))}
              workItemType={workItemType(witId)}
              tooltip={workItemTooltip}
              flairs={workItem => [`CLT: ${prettyMS(clt(workItem))}`]}
              extra={showWorkItemTimeDetails}
            />
          )
        });
      }
    };
  }, [accessors, clt, openModal, showWorkItemTimeDetails, totalClt, workItemTooltip, workItemsToDisplay]);

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
          data: Object.fromEntries(Object.entries(group).sort(([a], [b]) => sortByEnvironment(a, b))),
          yAxisPoint: clt,
          tooltip: wi => workItemTooltip(wi)
        }],
        pointColor: workItem => (workItem.priority ? priorityBasedColor(workItem.priority) : undefined),
        height: 420,
        linkForItem: prop('url'),
        className: 'w-full'
      })
    ),
    [clt, sortByEnvironment, workItemTooltip, workItemType, workItemsToDisplay]
  );

  if (preFilteredWorkItems.length === 0) return null;

  return (
    <GraphCard
      title="Change lead time"
      subtitle="Time taken to take a work item to production after development is complete"
      hasData={preFilteredWorkItems.length > 0}
      csvData={csvData}
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
              <li key={witId}>
                {`Change lead time for ${workItemType(witId).name[1].toLowerCase()} is computed from `}
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {stringifyDateField(workItemType(witId).devCompleteFields!)}
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {` to ${stringifyDateField(workItemType(witId).endDateFields!)}.`}
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
