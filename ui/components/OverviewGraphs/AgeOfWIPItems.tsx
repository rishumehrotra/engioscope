import { prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import type { ScatterLineGraphProps } from '../graphs/ScatterLineGraph';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import GraphCard from './helpers/GraphCard';
import { prettyMS, priorityBasedColor, shortDate } from '../../helpers/utils';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  stringifyDateField, getSidebarStatByKey, getSidebarItemStats, getSidebarHeadlineStats
} from './helpers/helpers';
import { createWIPWorkItemTooltip } from './helpers/tooltips';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers';

type AgeOfWIPItemsGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

export const AgeOfWIPItemsGraph: React.FC<AgeOfWIPItemsGraphProps> = ({ workItems, accessors, openModal }) => {
  const {
    organizeByWorkItemType, workItemType, lastUpdated, workItemTimes
  } = accessors;

  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(workItem => (
      Boolean(workItemTimes(workItem).start) && !workItemTimes(workItem).end)),
    [workItemTimes, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => (
      priorityFilter(workItem)
      && sizeFilter(workItem)
    ),
    [priorityFilter, sizeFilter]
  );

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(accessors),
    [accessors]
  );

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(preFilteredWorkItems, filter),
    [organizeByWorkItemType, preFilteredWorkItems, filter]
  );

  const ageOfWorkItem = useCallback(
    (workItem: UIWorkItem) => lastUpdated.getTime() - new Date(workItem.created.on).getTime(),
    [lastUpdated]
  );

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const totalAgeOfWorkItems = (workItems: UIWorkItem[]) => workItems.reduce(
      (acc, wi) => acc + ageOfWorkItem(wi),
      0
    );

    const aggregator = (workItems: UIWorkItem[]) => (
      workItems.length ? prettyMS(totalAgeOfWorkItems(workItems) / workItems.length) : '-'
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
                workItems.sort((a, b) => ageOfWorkItem(b) - ageOfWorkItem(a))
              )}
              workItemType={workItemType(witId)}
              tooltip={workItemTooltip}
              flairs={workItem => [prettyMS(ageOfWorkItem(workItem))]}
            />
          )
        });
      }
    };
  }, [accessors, ageOfWorkItem, openModal, workItemTooltip, workItemsToDisplay]);

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
          yAxisPoint: ageOfWorkItem,
          tooltip: wi => workItemTooltip(wi)
        }],
        pointColor: workItem => (workItem.priority ? priorityBasedColor(workItem.priority) : undefined),
        height: 420,
        linkForItem: prop('url'),
        className: 'w-full'
      })
    ),
    [ageOfWorkItem, workItemTooltip, workItemType, workItemsToDisplay]
  );

  return (
    <GraphCard
      title="Age of work-in-progress items"
      subtitle="How old are the currently work-in-progress items"
      hasData={preFilteredWorkItems.length > 0}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={workItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={workItems} setFilter={setPriorityFilter} />
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
                {`Age of ${workItemType(witId).name[1].toLowerCase()} is computed from `}
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {stringifyDateField(workItemType(witId).startDateFields!)}
                {` to today (${shortDate(lastUpdated)}).`}
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
