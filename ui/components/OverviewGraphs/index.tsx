import prettyMilliseconds from 'pretty-ms';
import { last, length, prop } from 'rambda';
import React, { useCallback, useMemo } from 'react';
import type {
  Overview, ProjectOverviewAnalysis, UIWorkItem, UIWorkItemType
} from '../../../shared/types';
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
import GraphCard from './GraphCard';

const workItemAccessors = (overview: Overview) => ({
  workItemType: (witId: string) => overview.types[witId],
  workItemById: (wid: number) => overview.byId[wid],
  workItemTimes: (wid: number) => overview.times[wid]
});

const timeDifference = ({ start, end }: { start: string; end: string }) => (
  new Date(end).getTime() - new Date(start).getTime()
);

const totalCycleTimeUsing = (cycleTime: (wid: number) => number | undefined) => [
  (acc: number, wid: number) => acc + (cycleTime(wid) || 0),
  0
] as const;

const workCenterTimeUsing = (workItemTimes: (wid: number) => Overview['times'][number]) => (wid: number) => (
  workItemTimes(wid).workCenters.reduce((a, wc) => a + timeDifference(wc), 0)
);

const workItemIdsFromLines = (lines: WorkItemLine[]) => (
  lines.reduce<number[]>(
    (acc, { workItemPoints }) => acc.concat(workItemPoints.flatMap(prop('workItemIds'))),
    []
  )
);

const isClosedToday = (workItemId: number, dayStart: Date, overview: Overview) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const closedAt = new Date(overview.times[workItemId].end!);
  const dateEnd = new Date(dayStart);
  dateEnd.setDate(dayStart.getDate() + 1);
  return closedAt >= dayStart && closedAt < dateEnd;
};

const isWIPToday = (workItemId: number, dayStart: Date, overview: Overview) => {
  const workItem = overview.times[workItemId];
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

const createCompletedWorkItemTooltip = (
  workItemType: (witId: string) => UIWorkItemType,
  cycleTime: (wid: number) => number | undefined,
  workCenterTime: (wid: number) => number
) => (workItem: UIWorkItem) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ct = cycleTime(workItem.id)!;
  const cycleTimeText = prettyMilliseconds(ct, { compact: true });
  const efficiency = Math.round((workCenterTime(workItem.id) / ct) * 100);

  return `
    <div class="w-72">
      <div class="pl-3" style="text-indent: -1.15rem">
        <img src="${workItemType(workItem.typeId).icon}" width="14" height="14" class="inline-block -mt-1" />
        <strong>#${workItem.id}:</strong> ${workItem.title}
        <div class="pt-1">
          <strong>Cycle time:</strong> ${cycleTimeText}
        </div>
        <div class="pt-1">
          <strong>Efficiency:</strong> ${efficiency}%
        </div>
      </div>
    </div>
  `.trim();
};

const createWIPWorkItemTooltip = (
  workItemType: (witId: string) => UIWorkItemType
) => (workItem: UIWorkItem) => `
    <div class="w-72">
      <div class="pl-3" style="text-indent: -1.15rem">
        <img src="${workItemType(workItem.typeId).icon}" width="14" height="14" class="inline-block -mt-1" />
        <strong>#${workItem.id}:</strong> ${workItem.title}
        <div class="pt-1">
          <strong>Age:</strong> ${prettyMilliseconds(Date.now() - new Date(workItem.created.on).getTime(), { compact: true })}
        </div>
      </div>
    </div>
  `.trim();

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const memoizedOrganizedClosedWorkItems = useMemo(
    () => organizedClosedWorkItems(projectAnalysis.overview),
    [projectAnalysis.overview]
  );

  const memoizedOrganizedAllWorkItems = useMemo(
    () => organizedAllWorkItems(projectAnalysis.overview),
    [projectAnalysis.overview]
  );

  const closedWorkItemsSplitByDay = useMemo(
    () => splitByDateForLineGraph(
      projectAnalysis, memoizedOrganizedClosedWorkItems, isClosedToday
    ),
    [memoizedOrganizedClosedWorkItems, projectAnalysis]
  );

  const wipSplitByDay = useMemo(() => splitByDateForLineGraph(
    projectAnalysis, memoizedOrganizedAllWorkItems, isWIPToday
  ), [memoizedOrganizedAllWorkItems, projectAnalysis]);

  const { workItemById, workItemType, workItemTimes } = useMemo(
    () => workItemAccessors(projectAnalysis.overview),
    [projectAnalysis.overview]
  );

  const cycleTime = useMemo(() => cycleTimeFor(projectAnalysis.overview), [projectAnalysis]);
  const totalCycleTime = useMemo(() => totalCycleTimeUsing(cycleTime), [cycleTime]);
  const workCenterTime = useMemo(() => workCenterTimeUsing(workItemTimes), [workItemTimes]);
  const totalWorkCenterTime = useCallback((wids: number[]) => (
    wids.reduce(
      (acc: number, wid: number) => acc + workCenterTime(wid),
      0
    )
  ), [workCenterTime]);
  const completedWorkItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(workItemType, cycleTime, workCenterTime),
    [cycleTime, workCenterTime, workItemType]
  );
  const wipWorkItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(workItemType),
    [workItemType]
  );

  const groupLabel = useCallback(({ witId, groupName }: GroupLabel) => (
    workItemType(witId).name[1] + (groupName === noGroup ? '' : ` - ${groupName}`)
  ), [workItemType]);

  const GraphBlock = useMemo(
    () => createGraphBlock({
      groupLabel, projectAnalysis, workItemType, workItemById
    }),
    [groupLabel, projectAnalysis, workItemById, workItemType]
  );

  const effortDistribution = useMemo(
    () => {
      const effortLayout = Object.entries(memoizedOrganizedAllWorkItems)
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
    [groupLabel, memoizedOrganizedAllWorkItems, totalWorkCenterTime]
  );

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
        sidebarHeadlineStat={lines => workItemIdsFromLines(lines).length}
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
                          color: contrastColour(lineColor(line)),
                          background: lineColor(line)
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
                            workItem={workItemById(workItemId)}
                            workItemType={workItemType(line.witId)}
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
          (acc, line) => acc + last(line.workItemPoints).workItemIds.length,
          0
        )}
        sidebarItemStat={allWorkItemIds => {
          const matchingLine = wipSplitByDay
            .find(line => line.workItemPoints
              .flatMap(prop('workItemIds'))
              .some(id => allWorkItemIds.includes(id)));

          return last(matchingLine?.workItemPoints || [])?.workItemIds?.length || '-';
        }}
        sidebarModalContents={line => {
          const lastDaysWorkItemIds = last(line.workItemPoints)?.workItemIds || [];

          if (!lastDaysWorkItemIds.length) return 'Nothing currently being worked on';

          return (
            <ul>
              {lastDaysWorkItemIds.map(workItemId => (
                <li key={workItemId} className="py-2">
                  <WorkItemLinkForModal
                    workItem={workItemById(workItemId)}
                    workItemType={workItemType(workItemById(workItemId).typeId)}
                    flair={prettyMilliseconds(Date.now() - new Date(workItemById(workItemId).created.on).getTime(), { compact: true })}
                  />
                </li>
              ))}
            </ul>
          );
        }}
      />

      <GraphCard
        title="Age of work-in-progress items"
        subtitle="How old are the currently work-in-progress items"
        left={(
          <div className="flex gap-4 justify-evenly items-center">
            {Object.entries(memoizedOrganizedAllWorkItems).map(([witId, group]) => (
              <ScatterLineGraph
                key={witId}
                graphData={[{
                  label: workItemType(witId).name[1],
                  data: Object.fromEntries(Object.entries(group).map(([groupName, workItemIds]) => [
                    groupName,
                    workItemIds
                      .filter(wid => {
                        const times = workItemTimes(wid);
                        return times.start && !times.end;
                      })
                      .map(workItemById)
                  ]).filter(x => x[1].length)),
                  yAxisPoint: (workItem: UIWorkItem) => Date.now() - new Date(workItem.created.on).getTime(),
                  tooltip: wipWorkItemTooltip
                }]}
                height={420}
                linkForItem={prop('url')}
              />
            ))}
          </div>
        )}
        right={(
          <LegendSidebar
            heading="Age of WIP items"
            headlineStatValue={(() => {
              const itemsWithoutEndDate = Object.values(memoizedOrganizedAllWorkItems)
                .flatMap(x => Object.values(x))
                .flat()
                .filter(x => {
                  const times = workItemTimes(x);
                  return times.start && !times.end;
                })
                .map(workItemById);

              if (!itemsWithoutEndDate.length) return '-';
              const totalAge = itemsWithoutEndDate.reduce((acc, { created }) => acc + (Date.now() - new Date(created.on).getTime()), 0);
              const averageAge = totalAge / itemsWithoutEndDate.length;
              return prettyMilliseconds(averageAge, { compact: true });
            })()}
            data={memoizedOrganizedAllWorkItems}
            workItemType={workItemType}
            childStat={workItemIds => {
              const itemsWithoutEndDate = workItemIds
                .filter(wid => {
                  const times = workItemTimes(wid);
                  return times.start && !times.end;
                })
                .map(workItemById);

              if (!itemsWithoutEndDate.length) return '-';

              const totalAge = itemsWithoutEndDate.reduce((acc, { created }) => acc + (Date.now() - new Date(created.on).getTime()), 0);
              const averageAge = totalAge / itemsWithoutEndDate.length;
              return prettyMilliseconds(averageAge, { compact: true });
            }}
            modalContents={({ workItemIds }) => {
              const itemsWithoutEndDate = workItemIds
                .filter(wid => {
                  const times = workItemTimes(wid);
                  return times.start && !times.end;
                })
                .map(workItemById);

              return (
                <ul>
                  {itemsWithoutEndDate.map(workItem => (
                    <li key={workItem.id} className="py-2">
                      <WorkItemLinkForModal
                        workItem={workItem}
                        workItemType={workItemType(workItem.typeId)}
                        flair={prettyMilliseconds(Date.now() - new Date(workItem.created.on).getTime(), { compact: true })}
                      />
                    </li>
                  ))}
                </ul>
              );
            }}
          />
        )}
      />

      <GraphCard
        title="Cycle time"
        subtitle="Time taken to complete a work item"
        left={(
          <div className="flex gap-4 justify-evenly items-center">
            {Object.entries(memoizedOrganizedClosedWorkItems).map(([witId, group]) => (
              <ScatterLineGraph
                key={witId}
                graphData={[{
                  label: workItemType(witId).name[1],
                  data: Object.fromEntries(Object.entries(group).map(([groupName, workItemIds]) => [
                    groupName,
                    workItemIds
                      .filter(wid => {
                        const times = workItemTimes(wid);
                        return times.start && times.end;
                      })
                      .map(workItemById)
                  ])),
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  yAxisPoint: (workItem: UIWorkItem) => cycleTime(workItem.id)!,
                  tooltip: completedWorkItemTooltip
                }]}
                height={420}
                linkForItem={prop('url')}
              />
            ))}
          </div>
        )}
        right={(
          <LegendSidebar
            heading="Average cycle time"
            data={memoizedOrganizedClosedWorkItems}
            headlineStatValue={(lines => {
              const allWids = workItemIdsFromLines(lines);

              return allWids.length
                ? prettyMilliseconds(
                  allWids.reduce(...totalCycleTime) / allWids.length,
                  { compact: true }
                )
                : '-';
            })(closedWorkItemsSplitByDay)}
            workItemType={workItemType}
            childStat={workItemIds => prettyMilliseconds(
              workItemIds.reduce(...totalCycleTime) / workItemIds.length,
              { compact: true }
            )}
            modalContents={({ witId, workItemIds }) => (
              workItemIds
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .sort((a, b) => cycleTime(b)! - cycleTime(a)!)
                .map(id => {
                  const workItem = workItemById(id);

                  return (
                    <ul key={workItem.id}>
                      <li className="my-3">
                        <WorkItemLinkForModal
                          workItem={workItem}
                          workItemType={workItemType(witId)}
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          flair={prettyMilliseconds(cycleTime(workItem.id)!, { compact: true })}
                        />
                      </li>
                    </ul>
                  );
                })
            )}
          />
        )}
      />

      <GraphCard
        title="Flow efficiency"
        subtitle="Percentage of time spent working"
        left={(
          <ul>
            {Object.entries(memoizedOrganizedClosedWorkItems).flatMap(([witId, group]) => (
              Object.entries(group).map(([groupName, workItemIds]) => {
                const workTime = totalWorkCenterTime(workItemIds);
                const totalTime = workItemIds.reduce(...totalCycleTime);
                const value = totalTime === 0 ? 0 : (workTime * 100) / totalTime;

                return (
                  <li key={witId + groupName} className="grid gap-4 my-4 items-center" style={{ gridTemplateColumns: '30% 1fr' }}>
                    <div className="text-right">
                      {workItemType(witId).name[1]}
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
        )}
        right={(
          <LegendSidebar
            heading="Flow efficiency"
            data={memoizedOrganizedClosedWorkItems}
            headlineStatValue={(lines => {
              const allWids = workItemIdsFromLines(lines);
              const workTime = totalWorkCenterTime(allWids);
              const totalTime = allWids.reduce(...totalCycleTime);
              return totalTime === 0 ? '-' : `${Math.round((workTime * 100) / totalTime)}%`;
            })(closedWorkItemsSplitByDay)}
            workItemType={workItemType}
            childStat={workItemIds => {
              const workTime = totalWorkCenterTime(workItemIds);
              const totalTime = workItemIds.reduce(...totalCycleTime);
              return totalTime === 0 ? '-' : `${Math.round((workTime * 100) / totalTime)}%`;
            }}
            modalContents={({ witId, workItemIds }) => (
              <ul>
                {workItemIds
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  .sort((a, b) => workCenterTime(a) / cycleTime(a)! - workCenterTime(b) / cycleTime(b)!)
                  .map(id => {
                    const workItem = workItemById(id);
                    const times = workItemTimes(id);
                    const totalTime = cycleTime(id);
                    const workingTime = prettyMilliseconds(
                      times.workCenters.reduce(
                        (acc, wc) => acc + timeDifference(wc), 0
                      ), { compact: true }
                    );
                    const workingTimeDetails = times.workCenters.map(
                      wc => `${wc.label} time: ${prettyMilliseconds(timeDifference(wc), { compact: true })}`
                    ).join(' + ');
                    const waitingTime = times.workCenters.length > 1
                      ? prettyMilliseconds(
                        times.workCenters.slice(1).reduce(
                          (acc, wc, index) => acc + timeDifference({
                            start: times.workCenters[index].end,
                            end: wc.start
                          }), 0
                        ), { compact: true }
                      )
                      : 'unknown';
                    const waitingTimeDetails = times.workCenters.length > 1
                      ? times.workCenters.slice(1).map(
                        (wc, index) => `${
                          times.workCenters[index].label
                        } to ${wc.label}: ${prettyMilliseconds(
                          timeDifference({ start: times.workCenters[index].end, end: wc.start }),
                          { compact: true }
                        )}`
                      ).join(' + ')
                      : 'unknown';

                    return (
                      <li className="my-4">
                        <WorkItemLinkForModal
                          workItem={workItem}
                          workItemType={workItemType(witId)}
                          flair={totalTime
                            ? `${Math.round(
                              (times.workCenters.reduce(
                                (acc, wc) => acc + timeDifference(wc), 0
                              ) * 100) / totalTime
                            )}%`
                            : '-'}
                        />
                        <div className="text-gray-500 text-sm ml-6 mb-3">
                          {`Total working time: ${workingTime} (${workingTimeDetails})`}
                          <br />
                          {`Total waiting time: ${waitingTime} (${waitingTimeDetails})`}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          />
        )}
      />

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
            data={memoizedOrganizedAllWorkItems}
            childStat={workItemIds => {
              const workTime = totalWorkCenterTime(workItemIds);
              const allWorkItemIds = Object.values(memoizedOrganizedAllWorkItems).reduce<number[]>(
                (acc, group) => acc.concat(...Object.values(group)),
                []
              );
              const totalTime = totalWorkCenterTime(allWorkItemIds);

              return totalTime
                ? `${((workTime * 100) / totalWorkCenterTime(allWorkItemIds)).toFixed(2)}%`
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
            headlineStatValue=""
            workItemType={workItemType}
          />
        )}
      />
    </div>
  );
};

export default OverviewGraphs;
