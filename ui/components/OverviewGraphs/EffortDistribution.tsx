import { add } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import { exists, prettyMS, shortDate } from '../../helpers/utils';
import GraphCard from './helpers/GraphCard';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  listFormat, stringifyDateField,
  lineColor, noGroup,
  getSidebarHeadlineStats, getSidebarItemStats, getSidebarStatByKey,
  timeDifference
} from './helpers/helpers';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createWIPWorkItemTooltip } from './helpers/tooltips';

const workCenterTimeThisMonthUsing = (workItemTimes: WorkItemAccessors['workItemTimes']) => {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  return (workItem: UIWorkItem) => {
    const times = workItemTimes(workItem);
    return times.workCenters.map(({ start, end }) => {
      if (!end || new Date(end) < monthAgo) return 0;
      if (new Date(start) > monthAgo) return timeDifference({ start, end });
      return timeDifference({ start: monthAgo.toISOString(), end });
    }).reduce(add, 0);
  };
};

const totalWorkCenterTimeThisMonthUsing = (workItemTimes: WorkItemAccessors['workItemTimes']) => {
  const workCenterTimeThisMonth = workCenterTimeThisMonthUsing(workItemTimes);
  return (workItems: UIWorkItem[]) => (
    workItems.reduce((acc, workItemId) => acc + workCenterTimeThisMonth(workItemId), 0)
  );
};

type EffortDistributionProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const EffortDistributionGraph: React.FC<EffortDistributionProps> = ({
  workItems, accessors, openModal
}) => {
  const {
    organizeByWorkItemType, workItemTimes, workItemType, lastUpdated
  } = accessors;
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem) && Boolean(workItemTimes(workItem).start),
    [priorityFilter, sizeFilter, workItemTimes]
  );

  const workItemsToDisplay = useMemo(
    () => organizeByWorkItemType(workItems, filter),
    [organizeByWorkItemType, workItems, filter]
  );

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(accessors),
    [accessors]
  );

  const workCenterTimeThisMonth = useMemo(
    () => workCenterTimeThisMonthUsing(workItemTimes),
    [workItemTimes]
  );

  const totalWorkCenterTimeThisMonth = useMemo(
    () => totalWorkCenterTimeThisMonthUsing(workItemTimes),
    [workItemTimes]
  );

  const monthAgo = useMemo(
    () => {
      const monthAgo = new Date(lastUpdated);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return monthAgo;
    },
    [lastUpdated]
  );

  const effortDistribution = useMemo(
    () => (
      Object.entries(workItemsToDisplay).reduce<{ byGroup: Record<string, number>; total: number; maxValue: number}>(
        (acc, [witId, group]) => {
          Object.entries(group).forEach(([groupName, workItems]) => {
            const effort = totalWorkCenterTimeThisMonth(workItems);
            acc.byGroup[witId + groupName] = effort;
            acc.total += effort;
            acc.maxValue = Math.max(acc.maxValue, effort);
          });
          return acc;
        },
        { byGroup: {}, total: 0, maxValue: 0 }
      )
    ),
    [totalWorkCenterTimeThisMonth, workItemsToDisplay]
  );

  const effortDistributionStringifiedForWit = useCallback(
    (x: unknown, witId: string) => {
      if (effortDistribution.total === 0) return '-';
      const matchingEntries = Object.entries(effortDistribution.byGroup)
        .filter(([key]) => key.startsWith(witId));

      const total = matchingEntries.reduce((acc, [, value]) => acc + value, 0);
      return `${((total * 100) / effortDistribution.total).toFixed(2)}%`;
    },
    [effortDistribution.byGroup, effortDistribution.total]
  );

  const effortDistributionStringifiedForGroup = useCallback(
    (x: unknown, witId: string, groupName: string) => (
      effortDistribution.total
        ? `${((effortDistribution.byGroup[witId + groupName] * 100) / effortDistribution.total).toFixed(2)}%`
        : '-'
    ),
    [effortDistribution.byGroup, effortDistribution.total]
  );

  const legendSidebarProps = useMemo<LegendSidebarProps>(() => {
    const { workItemType } = accessors;

    const items = getSidebarItemStats(
      workItemsToDisplay, workItemType, effortDistributionStringifiedForGroup
    );

    const headlineStats = getSidebarHeadlineStats(
      workItemsToDisplay, workItemType, effortDistributionStringifiedForWit, ''
    );

    return {
      headlineStats,
      items,
      onItemClick: key => {
        const [witId, groupName, workItems] = getSidebarStatByKey(key, workItemsToDisplay);

        return openModal({
          heading: 'Effort distribution',
          subheading: workItemSubheading(witId, groupName, workItems, workItemType),
          body: (
            <WorkItemFlatList
              workItemType={workItemType(witId)}
              workItems={workItems.sort((a, b) => workCenterTimeThisMonth(b) - workCenterTimeThisMonth(a))}
              tooltip={workItemTooltip}
              flairs={workItem => [prettyMS(workCenterTimeThisMonth(workItem))]}
              extra={workItem => (
                <div className="text-gray-500 text-sm ml-6 mb-2">
                  {workItemTimes(workItem).workCenters
                    .map(wc => {
                      if (!wc.end || new Date(wc.end) < monthAgo) return null;
                      if (new Date(wc.start) > monthAgo) return wc;
                      return {
                        ...wc,
                        start: monthAgo.toISOString()
                      };
                    })
                    .filter(exists)
                    .map(
                      wc => `${wc.label} time ${
                        prettyMS(timeDifference(wc))
                      } (${shortDate(new Date(wc.start))} to ${shortDate(new Date(wc.end || new Date().toISOString()))})`
                    ).join(' + ')}
                </div>

              )}
            />
          )
        });
      }
    };
  }, [
    accessors, openModal, workItemTooltip, workItemsToDisplay, workCenterTimeThisMonth,
    effortDistributionStringifiedForGroup, effortDistributionStringifiedForWit, monthAgo, workItemTimes
  ]);

  return (
    <GraphCard
      title="Effort distribution"
      subtitle="Percentage of time various work items have spent in work centers over the last 30 days"
      hasData={workItems.length > 0}
      noDataMessage="Couldn't find any work items"
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            <SizeFilter workItems={workItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={workItems} setFilter={setPriorityFilter} />
          </div>
          <ul className="pb-4">
            {Object.entries(workItemsToDisplay).flatMap(([witId, group]) => (
              Object.keys(group).map(groupName => (
                <li
                  key={witId + groupName}
                  className="grid gap-4 my-4 items-center mr-4"
                  style={{ gridTemplateColumns: '25% 5.5ch 1fr' }}
                >
                  <div className="flex items-center justify-end">
                    <img src={workItemType(witId).icon} alt={workItemType(witId).name[0]} className="h-4 w-4 inline-block mr-1" />
                    <span className="truncate">
                      {groupName === noGroup ? workItemType(witId).name[1] : groupName}
                    </span>
                  </div>
                  <span className="justify-self-end">
                    {effortDistributionStringifiedForGroup(null, witId, groupName)}
                  </span>
                  <div className="bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="rounded-md"
                      style={{
                        width: `${(effortDistribution.byGroup[witId + groupName] * 100) / effortDistribution.maxValue}%`,
                        backgroundColor: lineColor({ witId, groupName }),
                        height: '30px'
                      }}
                    />
                  </div>
                </li>
              ))
            ))}
          </ul>
          <ul className="text-sm text-gray-600 pl-4 mt-4 bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {Object.keys(workItemsToDisplay).map(witId => (
              <li>
                <details>
                  <summary>
                    {`Effort for ${workItemType(witId).name[1].toLowerCase()} is the time spent in `}
                    {`${listFormat(workItemType(witId).workCenters.map(wc => wc.label))}.`}
                  </summary>
                  <ul className="pl-8 list-disc mb-2">
                    {workItemType(witId).workCenters.map(wc => (
                      <li key={wc.label}>
                        {`Time spent in '${wc.label}' is computed from ${
                          stringifyDateField(wc.startDateField)
                        } to ${stringifyDateField(wc.endDateField)}.`}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default EffortDistributionGraph;
