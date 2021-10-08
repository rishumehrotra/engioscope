import prettyMilliseconds from 'pretty-ms';
import {
  always, length, pipe, range
} from 'rambda';
import type { ReactNode } from 'react';
import React, {
  Fragment,
  useState, useCallback, useMemo
} from 'react';
import type { Overview, ProjectOverviewAnalysis, UIWorkItem } from '../../shared/types';
import { contrastColour, createPalette, shortDate } from '../helpers/utils';
import { modalHeading, useModal } from './common/Modal';
import LineGraph from './graphs/LineGraph';
import { WorkItemLinkForModal } from './WorkItemLinkForModalProps';
import HorizontalBarGraph from './graphs/HorizontalBarGraph';

type WorkItemPoint = {
  date: Date;
  workItemIds: number[];
};

type WorkItemLine = {
  witId: string;
  groupName: string;
  workItems: WorkItemPoint[];
};

type MatchedDay = {
  date: Date;
  witId: string;
  groupName: string;
  workItemIds: number[];
};

const groupCreator = (overview: Overview) => (
  (workItemId: number) => {
    const { groupId } = overview.byId[workItemId];
    return groupId ? overview.groups[groupId] : undefined;
  }
);

const witIdCreator = (overview: Overview) => (
  (workItemId: number) => overview.byId[workItemId].typeId
);

const noGroup = 'no-group';

const cycleTimeFor = (overview: Overview) => (wid: number) => {
  const wi = overview.wiMeta[wid];
  if (!wi.start || !wi.end) return undefined;

  return new Date(wi.end).getTime() - new Date(wi.start).getTime();
};

const totalCycleTimeUsing = (cycleTime: (wid: number) => number | undefined) => [
  (acc: number, wid: number) => acc + (cycleTime(wid) || 0),
  0
] as const;

const totalWorkCenterTimeUsing = (overview: Overview) => (wid: number) => (
  overview.wiMeta[wid].workCenters.reduce((a, wc) => a + wc.time, 0)
);

const getWorkItemIdsUsingMeta = (pred: (workItemMeta: Overview['wiMeta'][number]) => boolean) => (
  (overview: Overview) => (
    Object.entries(overview.wiMeta)
      .filter(([, meta]) => pred(meta))
      .map(([id]) => Number(id))
  )
);

const isWorkItemClosed = (workItemMeta: Overview['wiMeta'][number]) => Boolean(workItemMeta.end);

const closedWorkItemIds = getWorkItemIdsUsingMeta(isWorkItemClosed);
const workItemIdsFull = getWorkItemIdsUsingMeta(always(true));

const organizeWorkItems = (workItemIds: (overview: Overview) => number[]) => (
  (overview: Overview) => {
    const witId = witIdCreator(overview);
    const group = groupCreator(overview);

    return workItemIds(overview)
      .reduce<Record<string, Record<string, number[]>>>(
        (acc, workItemId) => {
          acc[witId(workItemId)] = acc[witId(workItemId)] || {};

          acc[witId(workItemId)][group(workItemId)?.name || noGroup] = (
            acc[witId(workItemId)][group(workItemId)?.name || noGroup] || []
          ).concat(workItemId);

          return acc;
        }, {}
      );
  }
);

const workItemIdsForEffortDistribution = organizeWorkItems(workItemIdsFull);

const splitByDateForLineGraph = (
  organizedWorkItems: ReturnType<typeof organizeWorkItems>,
  filterWorkItems: (workItemId: number, date: Date, overview: Overview) => boolean
) => (
  (projectAnalysis: ProjectOverviewAnalysis): WorkItemLine[] => {
    const { lastUpdated } = projectAnalysis;
    const separator = ':';
    const key = (witId: string, groupName: string) => `${witId}${separator}${groupName}`;

    const splitByDay = range(0, 30).reduce<Record<string, { date: Date; workItemIds: number[] }[]>>((acc, day) => {
      const date = new Date(lastUpdated);
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      Object.entries(organizedWorkItems(projectAnalysis.overview)).forEach(([witId, groups]) => {
        Object.entries(groups).forEach(([groupName, workItemIds]) => {
          acc[key(witId, groupName)] = (acc[key(witId, groupName)] || [])
            .concat({
              date,
              workItemIds: workItemIds.filter(
                wid => filterWorkItems(wid, date, projectAnalysis.overview)
              )
            });
        });
      });

      return acc;
    }, {});

    return Object.entries(splitByDay).map(([key, wids]) => {
      const [witId, ...rest] = key.split(separator);
      return {
        witId,
        groupName: rest.join(separator),
        workItems: [...wids].reverse()
      };
    });
  }
);

const allWorkItemIds = [
  (acc: number[], { workItems }: WorkItemLine) => (
    acc.concat(workItems.flatMap(wi => wi.workItemIds))
  ),
  [] as number[]
] as const;

type GroupLabel = { witId: string; groupName: string };

const getClosedWorkItemsForGraph = splitByDateForLineGraph(
  organizeWorkItems(closedWorkItemIds),
  (workItemId, date, overview) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const closedAt = new Date(overview.wiMeta[workItemId].end!);
    const dateEnd = new Date(date);
    dateEnd.setDate(date.getDate() + 1);
    return closedAt.getTime() >= date.getTime() && closedAt.getTime() < dateEnd.getTime();
  }
);

const getAllWorkItemsForWIPGraph = splitByDateForLineGraph(
  organizeWorkItems(workItemIdsFull),
  (workItemId, dayStart, overview) => {
    const workItem = overview.wiMeta[workItemId];
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const start = workItem.start ? new Date(workItem.start) : undefined;
    const end = workItem.end ? new Date(workItem.end) : undefined;

    if (!start) return false; // Not yet started
    if (start > dayEnd) return false; // Started after today
    if (!end) return true; // Started today or before, but hasn't finished at all
    if (end < dayStart) return false; // Started today or before, finished before today
    return true; // Started today or before, finished today or after
  }
);

const lineColor = (() => {
  const c = createPalette([
    '#b3b300', '#ffa500', '#ff0000', '#ff00ff',
    '#a862ea', '#134e6f', '#4d4dff', '#9999ff',
    '#00b300', '#b30000'
  ]);

  return ({ witId, groupName }: GroupLabel) => (
    c(witId + groupName)
  );
})();

const widsInGroup = (workItems: WorkItemPoint[]) => (
  workItems.flatMap(({ workItemIds }) => workItemIds)
);

type LegendSidebarProps = {
  heading: ReactNode;
  headlineStatValue: ReactNode;
  headlineStatUnits?: ReactNode;
  data: WorkItemLine[];
  projectAnalysis: ProjectOverviewAnalysis;
  childStat: (workItemIds: WorkItemLine) => ReactNode;
  modalContents: (x: WorkItemLine) => ReactNode;
};

const LegendSidebar: React.FC<LegendSidebarProps> = ({
  heading, headlineStatValue, headlineStatUnits, data,
  projectAnalysis, childStat, modalContents
}) => {
  const [Modal, modalProps, open] = useModal();
  const [dataForModal, setDataForModal] = useState<WorkItemLine | null>(null);

  return (
    <div>
      <Modal
        {...modalProps}
        heading={dataForModal && modalHeading(
          projectAnalysis.overview.types[dataForModal.witId].name[1],
          dataForModal.groupName !== noGroup ? dataForModal.groupName : undefined
        )}
      >
        {dataForModal && modalContents(dataForModal)}
      </Modal>
      <div className="bg-gray-800 text-white p-4 mb-2 rounded-t-md">
        <h3 className="font-semibold pb-1">
          {heading}
        </h3>
        <div className="">
          <span className="text-2xl font-semibold">
            {headlineStatValue}
          </span>
          {' '}
          <span className="text-sm">
            {headlineStatUnits}
          </span>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-2">
        {data.map(({ workItems, witId, groupName }) => (
          <button
            key={witId + groupName}
            className="p-2 shadow rounded-md block text-left"
            style={{
              borderLeft: `4px solid ${lineColor({ witId, groupName })}`
            }}
            onClick={() => {
              setDataForModal({ workItems, witId, groupName });
              open();
            }}
          >
            <h4
              className="text-sm flex items-center h-10 overflow-hidden px-5"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textIndent: '-20px'
              }}
              data-tip={`${projectAnalysis.overview.types[witId].name[1]}${groupName === noGroup ? '' : `: ${groupName}`}`}
            >
              <img
                className="inline-block mr-1"
                alt={`Icon for ${projectAnalysis.overview.types[witId].name[0]}`}
                src={projectAnalysis.overview.types[witId].icon}
                width="16"
              />
              {projectAnalysis.overview.types[witId].name[1]}
              {groupName === noGroup ? '' : `: ${groupName}`}
            </h4>
            <div className="text-xl flex items-center pl-5 font-semibold">
              {childStat({ workItems, witId, groupName })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const getMatchingAtIndex = (
  data: WorkItemLine[],
  index: number
): MatchedDay[] => (
  data
    .map(line => ({
      witId: line.witId,
      groupName: line.groupName,
      date: line.workItems[index].date,
      workItemIds: line.workItems[index].workItemIds
    }))
    .filter(({ workItemIds }) => workItemIds.length > 0)
);

type CrosshairBubbleProps = {
  data: WorkItemLine[];
  index: number;
  projectAnalysis: ProjectOverviewAnalysis;
  groupLabel: (x: GroupLabel) => string;
  title: (x: MatchedDay[]) => ReactNode;
  itemStat: (x: number[]) => ReactNode;
};

const CrosshairBubble: React.FC<CrosshairBubbleProps> = ({
  data, index, projectAnalysis, groupLabel, title, itemStat
}) => {
  const matching = getMatchingAtIndex(data, index);

  return matching.length
    ? (
      <div className="bg-black bg-opacity-80 text-white text-sm py-3 px-4 rounded-md shadow">
        <h2
          className="font-semibold text-base mb-2 grid grid-cols-2 items-end"
          style={{
            gridTemplateColumns: '2fr 1fr'
          }}
        >
          <div className="text-xl">
            {title(matching)}
          </div>
          <div className="justify-self-end">
            {shortDate(matching[0].date)}
          </div>
        </h2>
        {matching
          .map(({ witId, groupName, workItemIds }) => (
            <div key={witId + groupName}>
              <div className="flex items-center pb-1">
                <img
                  className="inline-block mr-1"
                  alt={`Icon for ${projectAnalysis.overview.types[witId].name[0]}`}
                  src={projectAnalysis.overview.types[witId].icon}
                  width="16"
                />
                {groupLabel({ witId, groupName })}
                <span
                  className="rounded-full bg-white bg-opacity-20 text-xs font-semibold px-2 text-white ml-2 inline-block"
                  style={{
                    backgroundColor: lineColor({ witId, groupName }),
                    color: contrastColour(lineColor({ witId, groupName }))
                  }}
                >
                  {itemStat(workItemIds)}
                </span>
              </div>
            </div>
          ))}
      </div>
    )
    : null;
};

type GraphBlockProps = {
  data: WorkItemLine[];
  graphHeading: string;
  graphSubheading: string;
  pointToValue: (point: WorkItemPoint) => number;
  crosshairBubbleTitle: (x: MatchedDay[]) => ReactNode;
  aggregateStats: (x: number[]) => number;
  sidebarHeading: string;
  sidebarHeadlineStat: (x: WorkItemLine[]) => ReactNode;
  sidebarItemStat?: (x: WorkItemLine) => ReactNode;
  showFlairForWorkItemInModal?: boolean;
  formatValue: (x: number) => string;
  headlineStatUnits?: string;
  workItemInfoForModal?: (x: UIWorkItem) => ReactNode;
};

const createGraphBlock = ({ groupLabel, projectAnalysis }: {
  groupLabel: (x: GroupLabel) => string;
  projectAnalysis: ProjectOverviewAnalysis;
}) => {
  const workItems = (dataLine: WorkItemLine) => dataLine.workItems;
  const GraphBlock: React.FC<GraphBlockProps> = ({
    data, graphHeading, graphSubheading, pointToValue, crosshairBubbleTitle, formatValue,
    aggregateStats, sidebarHeading, sidebarHeadlineStat, showFlairForWorkItemInModal,
    sidebarItemStat, headlineStatUnits, workItemInfoForModal
  }) => {
    const [dayIndexInModal, setDayIndexInModal] = useState<number | null>(null);
    const [Modal, modalProps, openModal] = useModal();
    const aggregateAndFormat = useMemo(
      () => pipe(aggregateStats, formatValue),
      [aggregateStats, formatValue]
    );

    const matchingDateForModal = useMemo(() => (
      dayIndexInModal ? getMatchingAtIndex(data, dayIndexInModal) : null
    ), [data, dayIndexInModal]);

    return (
      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <Modal
          {...modalProps}
          heading={modalHeading(
            graphHeading,
            matchingDateForModal?.[0] && shortDate(matchingDateForModal[0].date)
          )}
        >
          {matchingDateForModal?.length
            ? matchingDateForModal?.map(({ witId, groupName, workItemIds }) => (
              <div
                key={witId + groupName}
                className="mb-8"
              >
                <h3 className="font-semibold text-lg">
                  {groupLabel({ witId, groupName })}
                  <span
                    className="text-base inline-block ml-2 px-3 rounded-full"
                    style={{
                      color: contrastColour(lineColor({ witId, groupName })),
                      backgroundColor: lineColor({ witId, groupName })
                    }}
                  >
                    {aggregateAndFormat(workItemIds)}
                  </span>
                </h3>
                <ul>
                  {workItemIds.map(workItemId => (
                    <li key={workItemId} className="py-2">
                      <WorkItemLinkForModal
                        workItem={projectAnalysis.overview.byId[workItemId]}
                        workItemType={projectAnalysis.overview.types[witId]}
                        flair={showFlairForWorkItemInModal && aggregateAndFormat([workItemId])}
                      />
                      {workItemInfoForModal?.(projectAnalysis.overview.byId[workItemId])}
                    </li>
                  ))}
                </ul>
              </div>
            ))
            : (
              <div className="text-gray-600 italic">
                Nothing to see here
              </div>
            )}
        </Modal>
        <h1 className="text-2xl font-semibold">
          {graphHeading}
        </h1>
        <p className="text-base text-gray-600 mb-4">
          {graphSubheading}
        </p>
        <div className="grid gap-8 grid-flow-col">
          {!data.length ? (
            <div className="text-gray-500 italic">
              Couldn't find any closed workitems in the last month.
            </div>
          ) : (
            <>
              <LineGraph<WorkItemLine, WorkItemPoint>
                lines={data}
                points={workItems}
                pointToValue={pointToValue}
                yAxisLabel={formatValue}
                lineLabel={groupLabel}
                xAxisLabel={x => shortDate(x.date)}
                lineColor={lineColor}
                crosshairBubble={(pointIndex: number) => (
                  <CrosshairBubble
                    data={data}
                    index={pointIndex}
                    projectAnalysis={projectAnalysis}
                    groupLabel={groupLabel}
                    title={crosshairBubbleTitle}
                    itemStat={aggregateAndFormat}
                  />
                )}
                onClick={(...args) => {
                  setDayIndexInModal(args[0]);
                  openModal();
                }}
              />
              <LegendSidebar
                heading={sidebarHeading}
                headlineStatValue={sidebarHeadlineStat(data)}
                data={data}
                projectAnalysis={projectAnalysis}
                headlineStatUnits={headlineStatUnits}
                childStat={
                  sidebarItemStat
                  || (({ workItems }) => aggregateAndFormat(workItems.reduce<number[]>((a, wi) => a.concat(wi.workItemIds), [])))
                }
                modalContents={line => (
                  <ul>
                    {line.workItems.map(({ date, workItemIds }) => (
                      workItemIds.length
                        ? (
                          <li key={date.toISOString()}>
                            <div className="font-semibold text-lg mt-4 mb-1">
                              {shortDate(date)}
                              <span
                                style={{
                                  color: contrastColour(lineColor({ witId: line.witId, groupName: line.groupName })),
                                  background: lineColor({ witId: line.witId, groupName: line.groupName })
                                }}
                                className="inline-block px-2 ml-2 rounded-full text-base"
                              >
                                {aggregateAndFormat(workItemIds)}
                              </span>
                            </div>
                            <ul>
                              {workItemIds.map(workItemId => (
                                <li key={workItemId} className="py-2">
                                  <WorkItemLinkForModal
                                    workItem={projectAnalysis.overview.byId[workItemId]}
                                    workItemType={projectAnalysis.overview.types[line.witId]}
                                    flair={showFlairForWorkItemInModal && aggregateAndFormat([workItemId])}
                                  />
                                  {workItemInfoForModal?.(projectAnalysis.overview.byId[workItemId])}
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
            </>
          )}
        </div>
      </div>
    );
  };
  return GraphBlock;
};

const OverviewGraphs: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const closedWorkItemsForGraph = useMemo(
    () => getClosedWorkItemsForGraph(projectAnalysis),
    [projectAnalysis]
  );

  const organizedWIPWorkItems = useMemo(
    () => getAllWorkItemsForWIPGraph(projectAnalysis),
    [projectAnalysis]
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
      const effortLayout = Object.entries(workItemIdsForEffortDistribution(projectAnalysis.overview))
        .map(([witId, group]) => ({
          witId,
          workTimes: Object.entries(group).reduce<Record<string, number>>((acc, [groupName, witIds]) => {
            acc[groupName] = witIds.reduce((acc, witId) => acc + (
              projectAnalysis.overview.wiMeta[witId].workCenters.reduce(
                (acc, workCenter) => acc + workCenter.time,
                0
              )
            ), 0);
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
      })).sort((a, b) => b.value - a.value);
    },
    [projectAnalysis.overview]
  );

  return (
    <div>
      <GraphBlock
        data={closedWorkItemsForGraph}
        graphHeading="Velocity"
        graphSubheading="Work items closed per day over the last month"
        pointToValue={x => x.workItemIds.length}
        crosshairBubbleTitle={() => 'Velocity'}
        aggregateStats={length}
        sidebarHeading="Velocity this month"
        formatValue={String}
        sidebarHeadlineStat={x => x.reduce((acc, { workItems }) => (
          acc + widsInGroup(workItems).length
        ), 0)}
      />

      <GraphBlock
        data={organizedWIPWorkItems}
        graphHeading="Work in progress"
        graphSubheading="Work items in progress per day over the last month"
        pointToValue={x => x.workItemIds.length}
        crosshairBubbleTitle={() => 'Work in progress'}
        aggregateStats={length}
        sidebarHeading="Work in progress items"
        formatValue={String}
        sidebarHeadlineStat={x => x
          .reduce(
            (acc, { workItems }) => acc + workItems[workItems.length - 1].workItemIds.length,
            0
          )}
        sidebarItemStat={
          x => x.workItems[x.workItems.length - 1].workItemIds.length
        }
      />

      <GraphBlock
        data={closedWorkItemsForGraph}
        graphHeading="Average cycle time"
        graphSubheading="Average time taken to complete a work item"
        pointToValue={group => (
          group.workItemIds.length
            ? group.workItemIds.reduce(...totalCycleTime) / group.workItemIds.length
            : 0
        )}
        crosshairBubbleTitle={() => 'Average cycle time'}
        aggregateStats={workItemIds => (
          workItemIds.length
            ? workItemIds.reduce(...totalCycleTime) / workItemIds.length
            : 0
        )}
        sidebarHeading="Overall average cycle time"
        sidebarHeadlineStat={data => {
          const allWids = data.reduce(...allWorkItemIds);

          return allWids.length
            ? prettyMilliseconds(
              allWids.reduce(...totalCycleTime) / allWids.length,
              { compact: true }
            )
            : '-';
        }}
        showFlairForWorkItemInModal
        formatValue={x => prettyMilliseconds(x, { compact: true })}
      />

      <GraphBlock
        data={closedWorkItemsForGraph}
        graphHeading="Flow efficiency"
        graphSubheading="Time spent waiting vs. working"
        pointToValue={group => {
          const workTime = group.workItemIds.reduce(...totalWorkCenterTime);
          const totalTime = group.workItemIds.reduce(...totalCycleTime);

          return totalTime === 0 ? 0 : (workTime * 100) / totalTime;
        }}
        crosshairBubbleTitle={() => 'Flow efficiency'}
        aggregateStats={workItemIds => {
          const workTime = workItemIds.reduce(...totalWorkCenterTime);
          const totalTime = workItemIds.reduce(...totalCycleTime);

          return Math.round(totalTime === 0 ? 0 : (workTime * 100) / totalTime);
        }}
        sidebarHeading="Overall flow efficiency"
        sidebarHeadlineStat={data => {
          const allWids = data.reduce<number[]>(
            (acc, { workItems }) => acc.concat(widsInGroup(workItems)),
            []
          );
          const cycleTime = allWids.reduce(...totalCycleTime);

          return cycleTime
            ? Math.round((allWids.reduce(...totalWorkCenterTime) * 100) / cycleTime)
            : 0;
        }}
        headlineStatUnits="%"
        showFlairForWorkItemInModal
        formatValue={x => `${x}%`}
        workItemInfoForModal={workItem => {
          const meta = projectAnalysis.overview.wiMeta[workItem.id];
          const totalTime = cycleTime(workItem.id);
          const timeString = meta.workCenters.map(
            workCenter => `${workCenter.label} time: ${prettyMilliseconds(workCenter.time, { compact: true })}`
          ).join(' + ');

          return (
            <div className="text-gray-500 text-sm ml-6 mb-2">
              {meta.workCenters.length > 1 ? `(${timeString})` : timeString}
              {' / '}
              {totalTime
                ? `Total time: ${prettyMilliseconds(totalTime, { compact: true })}`
                : 'Not completed yet'}
            </div>
          );
        }}
      />

      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <h1 className="text-2xl font-semibold">
          Effort distribution
        </h1>
        <p className="text-base text-gray-600 mb-4">
          Percentage of working time spent on various work items
        </p>

        <HorizontalBarGraph
          graphData={effortDistribution}
          width={500}
          formatValue={x => `${x.toFixed(2)}%`}
        />
      </div>
    </div>
  );
};

export default OverviewGraphs;
