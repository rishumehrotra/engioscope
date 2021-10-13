import prettyMilliseconds from 'pretty-ms';
import { length, prop } from 'rambda';
import React, { useCallback, useMemo } from 'react';
import type { Overview, ProjectOverviewAnalysis, UIWorkItem } from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import HorizontalBarGraph from '../graphs/HorizontalBarGraph';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import type { GroupLabel } from './helpers';
import {
  organizedClosedWorkItems, organizedAllWorkItems, cycleTimeFor,
  lineColor, noGroup
} from './helpers';
import type { WorkItemLine } from './day-wise-line-graph-helpers';
import {
  splitByDateForLineGraph
} from './day-wise-line-graph-helpers';
import { createGraphBlock } from './LineGraphBlock';
import { LegendSidebar } from './LegendSidebar';
import { contrastColour, shortDate } from '../../helpers/utils';

const totalCycleTimeUsing = (cycleTime: (wid: number) => number | undefined) => [
  (acc: number, wid: number) => acc + (cycleTime(wid) || 0),
  0
] as const;

const totalWorkCenterTimeUsing = (overview: Overview) => (wid: number) => (
  overview.wiMeta[wid].workCenters.reduce((a, wc) => a + wc.time, 0)
);

const allWorkItemIds = [
  (acc: number[], { workItemPoints }: WorkItemLine) => (
    acc.concat(workItemPoints.flatMap(wi => wi.workItemIds))
  ),
  [] as number[]
] as const;

const isClosedToday = (workItemId: number, dayStart: Date, overview: Overview) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const closedAt = new Date(overview.wiMeta[workItemId].end!);
  const dateEnd = new Date(dayStart);
  dateEnd.setDate(dayStart.getDate() + 1);
  return closedAt >= dayStart && closedAt < dateEnd;
};

const isWIPToday = (workItemId: number, dayStart: Date, overview: Overview) => {
  const workItem = overview.wiMeta[workItemId];
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  const start = workItem.start ? new Date(workItem.start) : undefined;
  const end = workItem.end ? new Date(workItem.end) : undefined;

  if (!start) return false; // Not yet started
  if (start > dayEnd) return false; // Started after today

  // Started today or before today
  if (!end) return true; // Started today or before, but hasn't finished at all
  return end > dayEnd; // Started today or before, not finished today
};

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const memoizedOrganizedClosedWorkItems = useMemo(
    () => organizedClosedWorkItems(projectAnalysis.overview),
    [projectAnalysis.overview]
  );

  const memoizedOrganizedAllWorkItems = useMemo(
    () => organizedAllWorkItems(projectAnalysis.overview),
    [projectAnalysis.overview]
  );

  const closedWorkItemsForGraph = useMemo(
    () => splitByDateForLineGraph(
      projectAnalysis, memoizedOrganizedClosedWorkItems, isClosedToday
    ),
    [memoizedOrganizedClosedWorkItems, projectAnalysis]
  );

  const cycleTime = useMemo(() => cycleTimeFor(projectAnalysis.overview), [projectAnalysis]);
  const totalCycleTime = useMemo(() => totalCycleTimeUsing(cycleTime), [cycleTime]);
  const totalWorkCenterTime = useMemo(() => [
    (acc: number, wid: number) => acc + totalWorkCenterTimeUsing(projectAnalysis.overview)(wid),
    0
  ] as const, [projectAnalysis]);

  const groupLabel = useCallback(({ witId, groupName }: GroupLabel) => (
    projectAnalysis.overview.types[witId].name[1]
      + (groupName === noGroup ? '' : ` - ${groupName}`)
  ), [projectAnalysis.overview.types]);

  const GraphBlock = useMemo(
    () => createGraphBlock({ groupLabel, projectAnalysis }),
    [groupLabel, projectAnalysis]
  );

  const effortDistribution = useMemo(
    () => {
      const effortLayout = Object.entries(memoizedOrganizedAllWorkItems)
        .map(([witId, group]) => ({
          witId,
          workTimes: Object.entries(group).reduce<Record<string, number>>((acc, [groupName, witIds]) => {
            acc[groupName] = witIds.reduce(...totalWorkCenterTime);
            return acc;
          }, {})
        }));

      // Effort for graph
      const effortWithFullTime = effortLayout
        .reduce<{ label: string; value: number; color: string }[]>((acc, { witId, workTimes }) => {
          Object.entries(workTimes).forEach(([groupName, time]) => {
            acc.push({
              label: `${projectAnalysis.overview.types[witId].name[1]} ${groupName === noGroup ? '' : `- ${groupName}`}`.trim(),
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
    [memoizedOrganizedAllWorkItems, projectAnalysis.overview.types, totalWorkCenterTime]
  );

  const wipSplitByDay = useMemo(() => splitByDateForLineGraph(
    projectAnalysis, memoizedOrganizedAllWorkItems, isWIPToday
  ), [memoizedOrganizedAllWorkItems, projectAnalysis]);

  return (
    <div>
      <GraphBlock
        data={memoizedOrganizedClosedWorkItems}
        daySplitter={isClosedToday}
        graphHeading="Velocity"
        graphSubheading="Work items closed per day over the last month"
        pointToValue={x => x.workItemIds.length}
        crosshairBubbleTitle="Velocity"
        aggregateStats={length}
        sidebarHeading="Velocity this month"
        formatValue={String}
        sidebarHeadlineStat={lines => lines.reduce(...allWorkItemIds).length}
        sidebarModalContents={line => (
          <ul>
            {line.workItemPoints.map(({ date, workItemIds }) => (
              workItemIds.length
                ? (
                  <li key={date.toISOString()}>
                    <div className="font-semibold text-lg mt-4 mb-1">
                      {shortDate(date)}
                      <span
                        style={{
                          color: contrastColour(lineColor({
                            witId: line.witId,
                            groupName: line.groupName
                          })),
                          background: lineColor({ witId: line.witId, groupName: line.groupName })
                        }}
                        className="inline-block px-2 ml-2 rounded-full text-base"
                      >
                        {workItemIds.length}
                      </span>
                    </div>
                    <ul>
                      {workItemIds.map(workItemId => (
                        <li key={workItemId} className="py-2">
                          <WorkItemLinkForModal
                            workItem={projectAnalysis.overview.byId[workItemId]}
                            workItemType={projectAnalysis.overview.types[line.witId]}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                )
                : null
            ))}
          </ul>
        )}
      />

      <GraphBlock
        data={memoizedOrganizedAllWorkItems}
        daySplitter={isWIPToday}
        graphHeading="Work in progress"
        graphSubheading="Work items in progress per day over the last month"
        pointToValue={x => x.workItemIds.length}
        crosshairBubbleTitle="Work in progress"
        aggregateStats={length}
        sidebarHeading="Work in progress items"
        formatValue={String}
        sidebarHeadlineStat={lines => lines.reduce(
          (acc, { workItemPoints: workItems }) => acc + workItems[workItems.length - 1].workItemIds.length,
          0
        )}
        sidebarItemStat={allWorkItemIds => {
          const matchingLine = wipSplitByDay
            .find(line => line.workItemPoints
              .flatMap(prop('workItemIds'))
              .some(id => allWorkItemIds.includes(id)));

          return matchingLine?.workItemPoints[matchingLine.workItemPoints.length - 1].workItemIds.length || 0;
        }}
        sidebarModalContents={line => {
          const lastDaysWorkItemIds = line.workItemPoints[line.workItemPoints.length - 1].workItemIds;

          if (!lastDaysWorkItemIds.length) return 'Nothing currently being worked on';

          return (
            <ul>
              {lastDaysWorkItemIds.map(workItemId => (
                <li key={workItemId} className="py-2">
                  <WorkItemLinkForModal
                    workItem={projectAnalysis.overview.byId[workItemId]}
                    workItemType={projectAnalysis.overview.types[projectAnalysis.overview.byId[workItemId].typeId]}
                  />
                </li>
              ))}
            </ul>
          );
        }}
      />

      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <h1 className="text-2xl font-semibold">
          Cycle time
        </h1>
        <p className="text-base text-gray-600 mb-4">
          Time taken to complete a work item.
        </p>

        <div className="grid gap-8 grid-flow-col">
          <div className="flex gap-4 justify-evenly items-center" style={{ width: '1085px' }}>
            {Object.entries(memoizedOrganizedClosedWorkItems).map(([witId, group]) => (
              <ScatterLineGraph
                key={witId}
                graphData={[{
                  label: projectAnalysis.overview.types[witId].name[1],
                  data: Object.fromEntries(Object.entries(group).map(([groupName, workItemIds]) => [
                    groupName,
                    workItemIds
                      .filter(wid => {
                        const meta = projectAnalysis.overview.wiMeta[wid];
                        return meta.start && meta.end;
                      })
                      .map(id => projectAnalysis.overview.byId[id])
                  ])),
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  yAxisPoint: (workItem: UIWorkItem) => cycleTime(workItem.id)!,
                  tooltip: (workItem: UIWorkItem) => `
              <div class="w-72">
                <div class="pl-3" style="text-indent: -1.15rem">
                  <img src="${projectAnalysis.overview.types[workItem.typeId].icon}" width="14" height="14" class="inline-block -mt-1" />
                  <strong>#${workItem.id}:</strong> ${workItem.title}
                  <div class="pt-1">
                    <strong>Cycle time:</strong> ${prettyMilliseconds(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                cycleTime(workItem.id)!,
                { compact: true }
              )}
                  </div>
                </div>
              </div>
            `.trim()
                }]}
                height={420}
                linkForItem={prop('url')}
              />
            ))}
          </div>
          <LegendSidebar
            heading="Average cycle time"
            data={memoizedOrganizedClosedWorkItems}
            headlineStatValue={(data => {
              const allWids = data.reduce(...allWorkItemIds);

              return allWids.length
                ? prettyMilliseconds(
                  allWids.reduce(...totalCycleTime) / allWids.length,
                  { compact: true }
                )
                : '-';
            })(closedWorkItemsForGraph)}
            projectAnalysis={projectAnalysis}
            childStat={workItemIds => prettyMilliseconds(
              workItemIds.reduce(...totalCycleTime) / workItemIds.length,
              { compact: true }
            )}
            modalContents={({ witId, workItemIds }) => (
              workItemIds
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .sort((a, b) => cycleTime(b)! - cycleTime(a)!)
                .map(id => {
                  const workItem = projectAnalysis.overview.byId[id];

                  return (
                    <ul key={workItem.id}>
                      <li className="my-3">
                        <WorkItemLinkForModal
                          workItem={workItem}
                          workItemType={projectAnalysis.overview.types[witId]}
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          flair={prettyMilliseconds(cycleTime(workItem.id)!, { compact: true })}
                        />
                      </li>
                    </ul>
                  );
                })
            )}
          />
        </div>
      </div>

      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <h1 className="text-2xl font-semibold">
          Flow efficiency
        </h1>
        <p className="text-base text-gray-600 mb-4">
          Percentage of time spent working
        </p>
        <div className="grid gap-8 grid-flow-col items-center">
          <ul style={{ width: '1085px' }}>
            {Object.entries(memoizedOrganizedClosedWorkItems).flatMap(([witId, group]) => (
              Object.entries(group).map(([groupName, workItemIds]) => {
                const workTime = workItemIds.reduce(...totalWorkCenterTime);
                const totalTime = workItemIds.reduce(...totalCycleTime);
                const value = totalTime === 0 ? 0 : (workTime * 100) / totalTime;

                return (
                  <li key={witId + groupName} className="grid gap-4 my-4 items-center" style={{ gridTemplateColumns: '30% 1fr' }}>
                    <div className="text-right">
                      {projectAnalysis.overview.types[witId].name[1]}
                      {groupName === noGroup ? '' : ` ${groupName}`}
                      {`: ${Math.round(value)}%`}
                    </div>
                    <div className="bg-gray-200">
                      <div style={{
                        width: `${value}%`,
                        backgroundColor: lineColor({ witId, groupName }),
                        height: '30px'
                      }}
                      />
                    </div>
                  </li>
                );
              })
            ))}
          </ul>

          <LegendSidebar
            heading="Flow efficiency"
            data={memoizedOrganizedClosedWorkItems}
            headlineStatValue={(data => {
              const allWids = data.reduce(...allWorkItemIds);
              const workTime = allWids.reduce(...totalWorkCenterTime);
              const totalTime = allWids.reduce(...totalCycleTime);
              return totalTime === 0 ? '-' : `${Math.round((workTime * 100) / totalTime)}%`;
            })(closedWorkItemsForGraph)}
            projectAnalysis={projectAnalysis}
            childStat={workItemIds => {
              const workTime = workItemIds.reduce(...totalWorkCenterTime);
              const totalTime = workItemIds.reduce(...totalCycleTime);
              return totalTime === 0 ? '-' : `${Math.round((workTime * 100) / totalTime)}%`;
            }}
            modalContents={({ witId, workItemIds }) => (
              <ul>
                {workItemIds.map(id => {
                  const workItem = projectAnalysis.overview.byId[id];
                  const meta = projectAnalysis.overview.wiMeta[workItem.id];
                  const totalTime = cycleTime(workItem.id);
                  const timeString = meta.workCenters.map(
                    workCenter => `${workCenter.label} time: ${prettyMilliseconds(workCenter.time, { compact: true })}`
                  ).join(' + ');

                  return (
                    <li className="my-4">
                      <WorkItemLinkForModal
                        workItem={workItem}
                        workItemType={projectAnalysis.overview.types[witId]}
                        flair={totalTime
                          ? `${Math.round((meta.workCenters.reduce((acc, wc) => acc + wc.time, 0) * 100) / totalTime)}%`
                          : '-'}
                      />
                      <div className="text-gray-500 text-sm ml-6 mb-3">
                        {meta.workCenters.length > 1 ? `(${timeString})` : timeString}
                        {' / '}
                        {totalTime
                          ? `Total time: ${prettyMilliseconds(totalTime, { compact: true })}`
                          : 'Not completed yet'}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          />
        </div>
      </div>

      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <h1 className="text-2xl font-semibold">
          Effort distribution
        </h1>
        <p className="text-base text-gray-600 mb-4">
          Percentage of working time spent on various work items
        </p>

        <div className="grid gap-8 grid-flow-col">
          <HorizontalBarGraph
            graphData={effortDistribution}
            width={1080}
            formatValue={x => (Number.isNaN(x) ? '<unknown>' : `${x.toFixed(2)}%`)}
          />
          <LegendSidebar
            heading="Effort distribution"
            data={memoizedOrganizedAllWorkItems}
            childStat={workItemIds => {
              const workTime = workItemIds.reduce(...totalWorkCenterTime);
              const allWorkItemIds = Object.values(memoizedOrganizedAllWorkItems).reduce<number[]>(
                (acc, group) => acc.concat(...Object.values(group)),
                []
              );

              return `${((workTime * 100) / allWorkItemIds.reduce(...totalWorkCenterTime)).toFixed(2)}%`;
            }}
            modalContents={({ workItemIds }) => {
              const workCenterTime = totalWorkCenterTimeUsing(projectAnalysis.overview);
              return (
                <ul>
                  {workItemIds
                    .map(id => projectAnalysis.overview.byId[id])
                    .filter(workItem => projectAnalysis.overview.wiMeta[workItem.id].workCenters.length)
                    .sort((a, b) => workCenterTime(b.id) - workCenterTime(a.id))
                    .map(workItem => (
                      <li key={workItem.id} className="my-4">
                        <WorkItemLinkForModal
                          workItem={workItem}
                          workItemType={projectAnalysis.overview.types[workItem.typeId]}
                          flair={prettyMilliseconds(
                            projectAnalysis.overview.wiMeta[workItem.id].workCenters.reduce(
                              (acc, workCenter) => acc + workCenter.time,
                              0
                            ),
                            { compact: true }
                          )}
                        />
                        <div className="text-gray-500 text-sm ml-6 mb-2">
                          {projectAnalysis.overview.wiMeta[workItem.id].workCenters.map(
                            workCenter => `${workCenter.label} time: ${prettyMilliseconds(workCenter.time, { compact: true })}`
                          ).join(' + ')}
                        </div>
                      </li>
                    ))}
                </ul>
              );
            }}
            headlineStatValue=""
            projectAnalysis={projectAnalysis}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewGraphs;
