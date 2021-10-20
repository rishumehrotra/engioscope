import prettyMilliseconds from 'pretty-ms';
import { last, length, prop } from 'rambda';
import React, { useMemo } from 'react';
import type {
  Overview, ProjectOverviewAnalysis, UIWorkItem, UIWorkItemType
} from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import {
  organizedClosedWorkItems, organizedAllWorkItems, cycleTimeFor,
  lineColor, timeDifference, workCenterTimeUsing, groupLabelUsing
} from './helpers';
import type { WorkItemLine } from './day-wise-line-graph-helpers';
import {
  splitByDateForLineGraph
} from './day-wise-line-graph-helpers';
import { createGraphBlock } from './LineGraphBlock';
import { contrastColour, shortDate } from '../../helpers/utils';
import { WIPAgeGraph } from './WIPAgeGraph';
import { CycleTimeGraph } from './CycleTimeGraph';
import { FlowEfficiencyGraph } from './FlowEfficiencyGraph';
import { EffortDistributionGraph } from './EffortDistributionGraph';

const workItemAccessors = (overview: Overview) => ({
  workItemType: (witId: string) => overview.types[witId],
  workItemById: (wid: number) => overview.byId[wid],
  workItemTimes: (wid: number) => overview.times[wid]
});

export const workItemIdsFromLines = (lines: WorkItemLine[]) => (
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
  workCenterTime: (wid: number) => number,
  workItemTimes: (wid: number) => Overview['times'][number]
) => (workItem: UIWorkItem) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ct = cycleTime(workItem.id)!;
  const cycleTimeText = prettyMilliseconds(ct, { compact: true });
  const efficiency = Math.round((workCenterTime(workItem.id) / ct) * 100);

  const times = workItemTimes(workItem.id).workCenters.reduce<{ label: string; timeDiff: number}[]>(
    (acc, wc, index, wcs) => {
      acc.push({
        label: wc.label,
        timeDiff: timeDifference(wc)
      });

      if (index !== wcs.length - 1) {
        acc.push({
          label: `${wc.label} to ${wcs[index + 1].label}`,
          timeDiff: timeDifference({ start: wc.end, end: wcs[index + 1].start })
        });
      }

      return acc;
    },
    []
  );

  const worstOffender = times.sort((a, b) => b.timeDiff - a.timeDiff)[0];

  return `
    <div class="w-72">
      <div class="pl-3" style="text-indent: -1.15rem">
        <img src="${workItemType(workItem.typeId).icon}" width="14" height="14" class="inline-block -mt-1" />
        <strong>#${workItem.id}:</strong> ${workItem.title}
        ${workItem.priority ? `
        <div class="pt-1">
          <strong>Priority:</strong> ${workItem.priority}
        </div>
        ` : ''}
        ${workItem.severity ? `
        <div class="pt-1">
          <strong>Severity:</strong> ${workItem.severity}
        </div>
        ` : ''}
        <div class="pt-1">
          <strong>Cycle time:</strong> ${cycleTimeText}
        </div>
        <div class="pt-1">
          <strong>Longest time:</strong> ${worstOffender.label} (${prettyMilliseconds(worstOffender.timeDiff, { compact: true })})
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
      ${workItem.priority ? `
      <div class="pt-1">
        <strong>Priority:</strong> ${workItem.priority}
      </div>
      ` : ''}
      ${workItem.severity ? `
      <div class="pt-1">
        <strong>Severity:</strong> ${workItem.severity}
      </div>
      ` : ''}
      <div class="pt-1">
        <strong>Current status:</strong> ${workItem.state}
      </div>
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

  const wipSplitByDay = useMemo(() => splitByDateForLineGraph(
    projectAnalysis, memoizedOrganizedAllWorkItems, isWIPToday
  ), [memoizedOrganizedAllWorkItems, projectAnalysis]);

  const { workItemById, workItemType, workItemTimes } = useMemo(
    () => workItemAccessors(projectAnalysis.overview),
    [projectAnalysis.overview]
  );

  const cycleTime = useMemo(() => cycleTimeFor(projectAnalysis.overview), [projectAnalysis]);
  const workCenterTime = useMemo(() => workCenterTimeUsing(workItemTimes), [workItemTimes]);

  const completedWorkItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(workItemType, cycleTime, workCenterTime, workItemTimes),
    [cycleTime, workCenterTime, workItemTimes, workItemType]
  );

  const wipWorkItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(workItemType),
    [workItemType]
  );

  const groupLabel = useMemo(() => groupLabelUsing(workItemType), [workItemType]);

  const GraphBlock = useMemo(
    () => createGraphBlock({
      groupLabel, projectAnalysis, workItemType, workItemById
    }),
    [groupLabel, projectAnalysis, workItemById, workItemType]
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

      <WIPAgeGraph
        allWorkItems={memoizedOrganizedAllWorkItems}
        workItemType={workItemType}
        workItemTimes={workItemTimes}
        workItemById={workItemById}
        workItemTooltip={wipWorkItemTooltip}
      />

      <CycleTimeGraph
        closedWorkItems={memoizedOrganizedClosedWorkItems}
        workItemType={workItemType}
        workItemTimes={workItemTimes}
        workItemById={workItemById}
        cycleTime={cycleTime}
        workItemTooltip={completedWorkItemTooltip}
      />

      <FlowEfficiencyGraph
        closedWorkItems={memoizedOrganizedClosedWorkItems}
        workItemType={workItemType}
        workItemTimes={workItemTimes}
        workItemById={workItemById}
        cycleTime={cycleTime}
      />

      <EffortDistributionGraph
        allWorkItems={memoizedOrganizedAllWorkItems}
        workItemType={workItemType}
        workItemTimes={workItemTimes}
        workItemById={workItemById}
      />
    </div>
  );
};

export default OverviewGraphs;

