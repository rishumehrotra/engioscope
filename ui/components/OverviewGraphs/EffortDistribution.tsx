import { add } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import { exists, prettyMS, shortDate } from '../../helpers/utils';
import GraphCard from './helpers/GraphCard';
import type { WorkItemAccessors } from './helpers/helpers';
import {
  listFormat, stringifyDateField,
  lineColor, noGroup,
  getSidebarHeadlineStats, getSidebarItemStats, getSidebarStatByKey
} from './helpers/helpers';
import { timeDifference } from '../../../shared/work-item-utils';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList, workItemSubheading } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createWIPWorkItemTooltip } from './helpers/tooltips';
import { byNum, desc } from '../../../shared/sort-utils';

const workCenterTimeInLastThreeMonthsUsing = (workItemTimes: WorkItemAccessors['workItemTimes']) => {
  const queryPeriodStart = new Date();
  queryPeriodStart.setDate(queryPeriodStart.getDate() - 90);

  return (workItem: UIWorkItem) => {
    const times = workItemTimes(workItem);
    return times.workCenters.map(({ start, end }) => {
      if (!end || new Date(end) < queryPeriodStart) return 0;
      if (new Date(start) > queryPeriodStart) return timeDifference({ start, end });
      return timeDifference({ start: queryPeriodStart.toISOString(), end });
    }).reduce(add, 0);
  };
};

const totalWorkCenterTimeInLastThreeMonthsUsing = (workItemTimes: WorkItemAccessors['workItemTimes']) => {
  const workCenterTimeInLastThreeMonths = workCenterTimeInLastThreeMonthsUsing(workItemTimes);
  return (workItems: UIWorkItem[]) => (
    workItems.reduce((acc, workItemId) => acc + workCenterTimeInLastThreeMonths(workItemId), 0)
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

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(workItem => Boolean(workItemTimes(workItem).start)),
    [workItemTimes, workItems]
  );

  const filter = useCallback(
    (workItem: UIWorkItem) => priorityFilter(workItem) && sizeFilter(workItem),
    [priorityFilter, sizeFilter]
  );

  const workCenterTimeInLastThreeMonths = useMemo(
    () => workCenterTimeInLastThreeMonthsUsing(workItemTimes),
    [workItemTimes]
  );

  const totalWorkCenterTimeInLastThreeMonths = useMemo(
    () => totalWorkCenterTimeInLastThreeMonthsUsing(workItemTimes),
    [workItemTimes]
  );

  const workItemsToDisplay = useMemo(
    () => Object.fromEntries(
      Object.entries(organizeByWorkItemType(preFilteredWorkItems, filter))
        .filter(([, group]) => Object.values(group).reduce(
          (acc, wis) => acc + totalWorkCenterTimeInLastThreeMonths(wis), 0
        ) > 0)
    ),
    [organizeByWorkItemType, preFilteredWorkItems, filter, totalWorkCenterTimeInLastThreeMonths]
  );

  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(accessors),
    [accessors]
  );

  const threeMonthsAgo = useMemo(
    () => {
      const threeMonthsAgo = new Date(lastUpdated);
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      return threeMonthsAgo;
    },
    [lastUpdated]
  );

  const hasData = useMemo(
    () => totalWorkCenterTimeInLastThreeMonths(preFilteredWorkItems) > 0,
    [preFilteredWorkItems, totalWorkCenterTimeInLastThreeMonths]
  );

  const effortDistribution = useMemo(
    () => (
      Object.entries(workItemsToDisplay).reduce<{ byGroup: Record<string, number>; total: number; maxValue: number}>(
        (acc, [witId, group]) => {
          Object.entries(group).forEach(([groupName, workItems]) => {
            const effort = totalWorkCenterTimeInLastThreeMonths(workItems);
            acc.byGroup[witId + groupName] = effort;
            acc.total += effort;
            acc.maxValue = Math.max(acc.maxValue, effort);
          });
          return acc;
        },
        { byGroup: {}, total: 0, maxValue: 0 }
      )
    ),
    [totalWorkCenterTimeInLastThreeMonths, workItemsToDisplay]
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
      workItemsToDisplay, accessors, effortDistributionStringifiedForGroup
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
              workItems={workItems.sort(desc(byNum(workCenterTimeInLastThreeMonths)))}
              tooltip={workItemTooltip}
              flairs={workItem => [prettyMS(workCenterTimeInLastThreeMonths(workItem))]}
              extra={workItem => (
                <div className="text-gray-500 text-sm ml-6 mb-2">
                  {workItemTimes(workItem).workCenters
                    .map(wc => {
                      if (!wc.end || new Date(wc.end) < threeMonthsAgo) return null;
                      if (new Date(wc.start) > threeMonthsAgo) return wc;
                      return {
                        ...wc,
                        start: threeMonthsAgo.toISOString()
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
    accessors, openModal, workItemTooltip, workItemsToDisplay, workCenterTimeInLastThreeMonths,
    effortDistributionStringifiedForGroup, effortDistributionStringifiedForWit, threeMonthsAgo, workItemTimes
  ]);

  return (
    <GraphCard
      title="Effort distribution"
      subtitle="Percentage of time various work items have spent in work centers over the last 90 days"
      hasData={preFilteredWorkItems.length > 0 && hasData}
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
                  className="grid gap-4 my-4 items-center"
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
              <li key={witId}>
                <details>
                  <summary className="cursor-pointer">
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
