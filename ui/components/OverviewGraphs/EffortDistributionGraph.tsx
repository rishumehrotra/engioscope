import prettyMilliseconds from 'pretty-ms';
import React, { useMemo } from 'react';
import { add } from 'rambda';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import HorizontalBarGraph from '../graphs/HorizontalBarGraph';
import type { OrganizedWorkItems } from './helpers';
import {
  hasWorkItems,
  groupByWorkItemType, lineColor, groupLabelUsing, timeDifference
} from './helpers';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';
import { exists, shortDate } from '../../helpers/utils';

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
};
export const EffortDistributionGraph: React.FC<EffortDistributionGraphProps> = ({
  allWorkItems, workItemById, workItemTimes, workItemType
}) => {
  const groupLabel = useMemo(() => groupLabelUsing(workItemType), [workItemType]);
  const workCenterTimeThisMonth = useMemo(() => workCenterTimeThisMonthUsing(workItemTimes), [workItemTimes]);
  const totalWorkCenterTimeThisMonth = useMemo(() => totalWorkCenterTimeThisMonthUsing(workItemTimes), [workItemTimes]);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const effortDistribution = useMemo(
    () => {
      const effortLayout = Object.entries(allWorkItems)
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
        .reduce<{ label: string; value: number; color: string }[]>((acc, { witId, workTimes }) => {
          Object.entries(workTimes).forEach(([groupName, time]) => {
            acc.push({
              label: groupLabel({ witId, groupName }),
              value: time,
              color: lineColor({ witId, groupName })
            });
          });
          return acc;
        }, []);

      const totalEffort = effortWithFullTime.reduce((acc, { value }) => acc + value, 0);

      return effortWithFullTime.map(({ value, label, color }) => ({
        color,
        label,
        value: (value * 100) / totalEffort
      }));
    },
    [groupLabel, allWorkItems, totalWorkCenterTimeThisMonth]
  );

  return (
    <GraphCard
      title="Effort distribution"
      subtitle="Percentage of time various work items have spent in work centers over the last 30 days"
      hasData={hasWorkItems(allWorkItems)}
      noDataMessage="Couldn't find any matching workitems"
      left={(
        <HorizontalBarGraph
          graphData={effortDistribution}
          width={1023}
          className="w-full"
          formatValue={x => (Number.isNaN(x) ? '<unknown>' : `${x.toFixed(2)}%`)}
        />
      )}
      right={(
        <LegendSidebar
          heading="Effort distribution"
          data={allWorkItems}
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
