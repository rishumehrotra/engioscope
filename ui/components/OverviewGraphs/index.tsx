import prettyMilliseconds from 'pretty-ms';
import { last, length, prop } from 'rambda';
import React, { useMemo, useState } from 'react';
import type { Overview, ProjectOverviewAnalysis } from '../../../shared/types';
import { WorkItemLinkForModal } from '../WorkItemLinkForModal';
import {
  organizedClosedWorkItems, organizedAllWorkItems, cycleTimeFor,
  lineColor, groupLabelUsing, groupByWorkItemType, collectFilters
} from './helpers';
import type { WorkItemLine } from './day-wise-line-graph-helpers';
import {
  splitByDateForLineGraph
} from './day-wise-line-graph-helpers';
import { createGraphBlock } from './LineGraphBlock';
import { contrastColour, num, shortDate } from '../../helpers/utils';
import { WIPAgeGraph } from './WIPAgeGraph';
import { CycleTimeGraph } from './CycleTimeGraph';
import { FlowEfficiencyGraph } from './FlowEfficiencyGraph';
import { EffortDistributionGraph } from './EffortDistributionGraph';
import { useRemoveSort } from '../../hooks/sort-hooks';
import BugLeakageAndRCAGraph from './BugLeakageAndRCAGraph';
import OverviewFilters from './OverviewFilters';
import AgeOfWorkItemsByStatus from './AgeOfWorkItemsByState';

const workItemAccessors = (overview: Overview) => ({
  workItemType: (witId: string) => overview.types[witId],
  workItemById: (wid: number) => overview.byId[wid],
  workItemTimes: (wid: number) => overview.times[wid],
  workItemGroup: (wid: number) => (overview.byId[wid].groupId
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ? overview.groups[overview.byId[wid].groupId!]
    : null)
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

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const [selectedFilters, setSelectedFilters] = useState<{ label: string; tags: string[] }[]>([]);
  useRemoveSort();

  const {
    workItemById, workItemType, workItemTimes, workItemGroup
  } = useMemo(
    () => workItemAccessors(projectAnalysis.overview),
    [projectAnalysis.overview]
  );

  const filters = useMemo(
    () => collectFilters(Object.values(projectAnalysis.overview.byId)),
    [projectAnalysis.overview.byId]
  );

  const memoizedOrganizedClosedWorkItems = useMemo(
    () => organizedClosedWorkItems(projectAnalysis.overview, workItemById, selectedFilters),
    [projectAnalysis.overview, selectedFilters, workItemById]
  );

  const memoizedOrganizedAllWorkItems = useMemo(
    () => organizedAllWorkItems(projectAnalysis.overview, workItemById, selectedFilters),
    [projectAnalysis.overview, selectedFilters, workItemById]
  );

  const wipSplitByDay = useMemo(() => splitByDateForLineGraph(
    projectAnalysis, memoizedOrganizedAllWorkItems, isWIPToday
  ), [memoizedOrganizedAllWorkItems, projectAnalysis]);

  const cycleTime = useMemo(() => cycleTimeFor(projectAnalysis.overview), [projectAnalysis]);
  const groupLabel = useMemo(() => groupLabelUsing(workItemType), [workItemType]);

  const GraphBlock = useMemo(
    () => createGraphBlock({
      groupLabel, projectAnalysis, workItemType, workItemById
    }),
    [groupLabel, projectAnalysis, workItemById, workItemType]
  );

  return (
    <div>
      <OverviewFilters filters={filters} onChange={setSelectedFilters} />

      <GraphBlock
        data={memoizedOrganizedClosedWorkItems}
        daySplitter={isClosedToday}
        graphHeading="Velocity"
        graphSubheading="Work items completed over the last 30 days"
        pointToValue={x => x.workItemIds.length}
        crosshairBubbleTitle="Velocity"
        aggregateStats={length}
        sidebarHeading="Velocity over the last 30 days"
        formatValue={num}
        sidebarHeadlineStats={data => (
          Object.entries(groupByWorkItemType(data))
            .map(([witId, items]) => ({
              heading: workItemType(witId).name[1],
              value: num(items.length),
              unit: 'total'
            }))
        )}
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

      <CycleTimeGraph
        closedWorkItems={memoizedOrganizedClosedWorkItems}
        workItemType={workItemType}
        workItemTimes={workItemTimes}
        workItemById={workItemById}
        cycleTime={cycleTime}
        workItemGroup={workItemGroup}
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

      <BugLeakageAndRCAGraph
        allWorkItems={memoizedOrganizedAllWorkItems}
        lastUpdated={projectAnalysis.lastUpdated}
        workItemType={workItemType}
        workItemById={workItemById}
      />

      <AgeOfWorkItemsByStatus
        allWorkItems={memoizedOrganizedAllWorkItems}
        workItemTimes={workItemTimes}
        workItemType={workItemType}
        workItemById={workItemById}
        workItemGroup={workItemGroup}
      />

      <GraphBlock
        data={memoizedOrganizedAllWorkItems}
        daySplitter={isWIPToday}
        graphHeading="Work in progress trend"
        graphSubheading="Trend of work items in progress per day over the last 30 days"
        pointToValue={x => x.workItemIds.length}
        crosshairBubbleTitle="Work in progress"
        aggregateStats={length}
        sidebarHeading="Work in progress items"
        formatValue={num}
        sidebarHeadlineStats={data => (
          Object.entries(groupByWorkItemType(data))
            .map(([witId, workItemIds]) => ({
              heading: workItemType(witId).name[1],
              value: num(workItemIds
                .filter(workItemId => {
                  const times = workItemTimes(workItemId);
                  return times.start && !times.end;
                })
                .length),
              unit: 'today'
            }))
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
        workItemGroup={workItemGroup}
      />
    </div>
  );
};

export default OverviewGraphs;
