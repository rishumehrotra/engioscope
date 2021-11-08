import prettyMilliseconds from 'pretty-ms';
import React, { useMemo } from 'react';
import { add } from 'rambda';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from './WorkItemLinkForModal';
import type { OrganizedWorkItems } from './helpers';
import {
  noGroup, groupByWorkItemType, lineColor, timeDifference
} from './helpers';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import { exists, shortDate } from '../../helpers/utils';
import { createWIPWorkItemTooltip } from './tooltips';
import usePriorityFilter from './use-priority-filter';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';

const workCenterTimeThisMonthUsing = (workItemTimes: (wid: number) => Overview['times'][number]) => {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  return (workItemId: number) => {
    const times = workItemTimes(workItemId);
    return times.workCenters.map(({ start, end }) => {
      if (!end || new Date(end) < monthAgo) return 0;
      if (new Date(start) > monthAgo) return timeDifference({ start, end });
      return timeDifference({ start: monthAgo.toISOString(), end });
    }).reduce(add, 0);
  };
};

const totalWorkCenterTimeThisMonthUsing = (workItemTimes: (wid: number) => Overview['times'][number]) => {
  const workCenterTimeThisMonth = workCenterTimeThisMonthUsing(workItemTimes);
  return (workItemIds: number[]) => (
    workItemIds.reduce((acc, workItemId) => acc + workCenterTimeThisMonth(workItemId), 0)
  );
};

type EffortDistributionGraphProps = {
  allWorkItems: OrganizedWorkItems;
  workItemById: (wid: number) => UIWorkItem;
  workItemTimes: (wid: number) => Overview['times'][number];
  workItemType: (witId: string) => UIWorkItemType;
  workItemGroup: (wid: number) => Overview['groups'][string] | null;
};
export const EffortDistributionGraph: React.FC<EffortDistributionGraphProps> = ({
  allWorkItems, workItemById, workItemTimes, workItemType, workItemGroup
}) => {
  const workCenterTimeThisMonth = useMemo(() => workCenterTimeThisMonthUsing(workItemTimes), [workItemTimes]);
  const totalWorkCenterTimeThisMonth = useMemo(() => totalWorkCenterTimeThisMonthUsing(workItemTimes), [workItemTimes]);
  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(workItemType, workItemTimes, workItemGroup),
    [workItemGroup, workItemTimes, workItemType]
  );

  const [priorities, priorityState, setPriorityState, filteredData] = usePriorityFilter(allWorkItems, workItemById);

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const effortDistribution = useMemo(
    () => {
      const effortLayout = Object.entries(filteredData)
        .map(([witId, group]) => ({
          witId,
          workTimes: Object.entries(group).reduce<Record<string, number>>(
            (acc, [groupName, workItemIds]) => {
              acc[groupName] = totalWorkCenterTimeThisMonth(workItemIds);
              return acc;
            },
            {}
          )
        }));

      // Effort for graph
      const effortWithFullTime = effortLayout
        .reduce<{ label: string; value: number; witId: string; color: string }[]>((acc, { witId, workTimes }) => {
          Object.entries(workTimes).forEach(([groupName, time]) => {
            acc.push({
              label: groupName,
              witId,
              value: time,
              color: lineColor({ witId, groupName })
            });
          });
          return acc;
        }, []);

      const totalEffort = effortWithFullTime.reduce((acc, { value }) => acc + value, 0);

      return effortWithFullTime.map(effort => ({
        ...effort,
        value: totalEffort ? (effort.value * 100) / totalEffort : 0
      }));
    },
    [filteredData, totalWorkCenterTimeThisMonth]
  );

  const maxValue = useMemo(() => Math.max(...effortDistribution.map(({ value }) => value)), [effortDistribution]);

  return (
    <GraphCard
      title="Effort distribution"
      subtitle="Percentage of time various work items have spent in work centers over the last 30 days"
      hasData={maxValue > 0}
      noDataMessage="Couldn't find any matching work items"
      left={(
        <>
          <div className="flex justify-end mb-8 mr-4">
            <MultiSelectDropdownWithLabel
              label="Priority"
              options={priorities}
              value={priorityState}
              onChange={setPriorityState}
              className="w-48 text-sm"
            />
          </div>
          <ul>
            {effortDistribution.map(({
              label, value, color, witId
            }) => (
              <li
                key={label}
                className="grid gap-4 my-4 items-center mr-4"
                style={{ gridTemplateColumns: '25% 5.5ch 1fr' }}
              >
                <div className="flex items-center justify-end">
                  <img src={workItemType(witId).icon} alt={workItemType(witId).name[0]} className="h-4 w-4 inline-block mr-1" />
                  <span className="truncate">
                    {label === noGroup ? workItemType(witId).name[1] : label}
                  </span>
                </div>
                <div className="justify-self-end">
                  {`${value.toFixed(2)}%`}
                </div>
                <div className="bg-gray-100 rounded-md overflow-hidden">
                  <div
                    className="h-8 rounded-lg"
                    style={{
                      width: `${maxValue ? (value * 100) / maxValue : 0}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      right={(
        <LegendSidebar
          heading="Effort distribution"
          data={filteredData}
          headlineStats={data => {
            const grouped = groupByWorkItemType(data);
            const totalTime = Object.values(grouped).reduce(
              (acc, workItemIds) => acc + totalWorkCenterTimeThisMonth(workItemIds),
              0
            );
            return (
              Object.entries(grouped)
                .map(([witId, workItemIds]) => ({
                  heading: workItemType(witId).name[1],
                  value: totalTime
                    ? `${((totalWorkCenterTimeThisMonth(workItemIds) * 100) / totalTime).toFixed(2)}%`
                    : '-'
                }))
            );
          }}
          workItemType={workItemType}
          childStat={workItemIds => {
            const workTime = totalWorkCenterTimeThisMonth(workItemIds);
            const allWorkItemIds = Object.values(allWorkItems).reduce<number[]>(
              (acc, group) => acc.concat(...Object.values(group)),
              []
            );
            const totalTime = totalWorkCenterTimeThisMonth(allWorkItemIds);

            return totalTime
              ? `${((workTime * 100) / totalTime).toFixed(2)}%`
              : '-';
          }}
          modalContents={({ workItemIds }) => (
            <ul>
              {workItemIds
                .map(workItemById)
                .filter(workItem => workItemTimes(workItem.id).workCenters.length)
                .sort((a, b) => workCenterTimeThisMonth(b.id) - workCenterTimeThisMonth(a.id))
                .map(workItem => (
                  <li key={workItem.id} className="my-4">
                    <WorkItemLinkForModal
                      workItem={workItem}
                      workItemType={workItemType(workItem.typeId)}
                      tooltip={workItemTooltip}
                      flair={prettyMilliseconds(
                        workItemTimes(workItem.id).workCenters.reduce(
                          (acc, wc) => acc + timeDifference(wc),
                          0
                        ),
                        { compact: true }
                      )}
                    />
                    <div className="text-gray-500 text-sm ml-6 mb-2">
                      {workItemTimes(workItem.id).workCenters
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
                            prettyMilliseconds(timeDifference(wc), { compact: true })
                          } (${shortDate(new Date(wc.start))} to ${shortDate(new Date(wc.end || new Date().toISOString()))})`
                        ).join(' + ')}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        />
      )}
    />
  );
};
