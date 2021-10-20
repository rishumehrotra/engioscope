import prettyMilliseconds from 'pretty-ms';
import React, { useMemo } from 'react';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import HorizontalBarGraph from '../graphs/HorizontalBarGraph';
import type { OrganizedWorkItems } from './helpers';
import {
  groupByWorkItemType,
  totalWorkCenterTimeUsing,
  workCenterTimeUsing, lineColor, groupLabelUsing, timeDifference
} from './helpers';
import { LegendSidebar } from './LegendSidebar';
import GraphCard from './GraphCard';

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
  const workCenterTime = useMemo(() => workCenterTimeUsing(workItemTimes), [workItemTimes]);
  const totalWorkCenterTime = useMemo(() => totalWorkCenterTimeUsing(workItemTimes), [workItemTimes]);

  const effortDistribution = useMemo(
    () => {
      const effortLayout = Object.entries(allWorkItems)
        .map(([witId, group]) => ({
          witId,
          workTimes: Object.entries(group).reduce<Record<string, number>>(
            (acc, [groupName, workItemIds]) => {
              acc[groupName] = totalWorkCenterTime(workItemIds);
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
    [groupLabel, allWorkItems, totalWorkCenterTime]
  );

  return (
    <GraphCard
      title="Effort distribution"
      subtitle="Percentage of working time spent on various work items"
      left={(
        <HorizontalBarGraph
          graphData={effortDistribution}
          width={1023}
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
              (acc, workItemIds) => acc + totalWorkCenterTime(workItemIds),
              0
            );
            return (
              Object.entries(grouped)
                .map(([witId, workItemIds]) => ({
                  heading: workItemType(witId).name[1],
                  value: totalTime
                    ? `${((totalWorkCenterTime(workItemIds) * 100) / totalTime).toFixed(2)}%`
                    : '-'
                }))
            );
          }}
          workItemType={workItemType}
          childStat={workItemIds => {
            const workTime = totalWorkCenterTime(workItemIds);
            const allWorkItemIds = Object.values(allWorkItems).reduce<number[]>(
              (acc, group) => acc.concat(...Object.values(group)),
              []
            );
            const totalTime = totalWorkCenterTime(allWorkItemIds);

            return totalTime
              ? `${((workTime * 100) / totalTime).toFixed(2)}%`
              : '-';
          }}
          modalContents={({ workItemIds }) => (
            <ul>
              {workItemIds
                .map(workItemById)
                .filter(workItem => workItemTimes(workItem.id).workCenters.length)
                .sort((a, b) => workCenterTime(b.id) - workCenterTime(a.id))
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
                      {workItemTimes(workItem.id).workCenters.map(
                        wc => `${wc.label} time: ${prettyMilliseconds(timeDifference(wc), { compact: true })}`
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
