import prettyMilliseconds from 'pretty-ms';
import { length, prop, range } from 'rambda';
import type { ReactNode } from 'react';
import React, { Fragment, useCallback, useMemo } from 'react';
import type { Overview, ProjectOverviewAnalysis } from '../../shared/types';
import { shortDate } from '../helpers/utils';
import LineGraph from './graphs/LineGraph';

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
const isWorkItemOpen = (workItemMeta: Overview['wiMeta'][number]) => (
  Boolean(workItemMeta.start) && !isWorkItemClosed(workItemMeta)
);

const closedWorkItemIds = getWorkItemIdsUsingMeta(isWorkItemClosed);
const openWorkItemIds = getWorkItemIdsUsingMeta(isWorkItemOpen);

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

const organizedClosedWorkItems = organizeWorkItems(closedWorkItemIds);
const organizedWipWorkItems = organizeWorkItems(openWorkItemIds);

const splitByDateForLineGraph = (
  organizedWorkItems: ReturnType<typeof organizeWorkItems>,
  filterWorkItems: (workItemId: number, date: Date, overview: Overview) => boolean
) => (
  (projectAnalysis: ProjectOverviewAnalysis) => {
    const { lastUpdated } = projectAnalysis;
    const separator = ':';
    const key = (witId: string, groupName: string) => `${witId}${separator}${groupName}`;

    const splitByDay = range(0, 30).reduce<Record<string, { date: Date; workItemIds: number[] }[]>>((acc, day) => {
      // TODO: FIXME Bad hack of hardcoded 2021
      const date = new Date(`${lastUpdated} 2021`);
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
  (acc: number[], { workItems }: ReturnType<ReturnType<typeof splitByDateForLineGraph>>[number]) => (
    acc.concat(workItems.flatMap(wi => wi.workItemIds))
  ),
  [] as number[]
] as const;

const splitOrganizedWorkItemsByDate = (
  projectAnalysis: ProjectOverviewAnalysis,
  organizedWorkItems: ReturnType<ReturnType<typeof organizeWorkItems>>,
  filterWorkItems: (workItemId: number, date: Date) => boolean
) => {
  const { lastUpdated } = projectAnalysis;

  return (
    range(0, 31).map(day => {
      // TODO: FIXME Bad hack of hardcoded 2021
      const date = new Date(`${lastUpdated} 2021`);
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      return {
        date,
        items: Object.entries(organizedWorkItems)
          .flatMap(([witId, groupName]) => (
            Object.entries(groupName)
              .flatMap(([groupName, workItemIds]) => ({
                witId,
                groupName,
                workItemIds: workItemIds.filter(workItemId => (
                  filterWorkItems(workItemId, date)
                ))
              }))
          ))
      };
    }).reverse()
  );
};

const displayTable = (
  projectAnalysis: ProjectOverviewAnalysis,
  organizedWorkItemsByDate: ReturnType<typeof splitOrganizedWorkItemsByDate>,
  title: string,
  value: (item: ReturnType<typeof splitOrganizedWorkItemsByDate>[number]['items'][number]) => ReactNode
) => (
  <table className="flex-1">
    <thead>
      <tr>
        <th>Date</th>
        <th style={{ height: '100px' }}>{title}</th>
      </tr>
    </thead>
    <tbody>
      {organizedWorkItemsByDate.map(({ date, items }) => (
        <tr key={date.toISOString()} className="border-b-2 border-black">
          <td className="p-4">{date.toLocaleDateString()}</td>
          <td style={{ height: '650px' }}>
            <ul>
              {items.map(item => (
                <li key={item.groupName}>
                  {`${
                    projectAnalysis.overview.types[item.witId].name[1]
                  }${
                    item.groupName === noGroup ? '' : ` - ${item.groupName}`
                  }: `}
                  {value(item)}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const getClosedWorkItemsForGraph = splitByDateForLineGraph(
  organizedClosedWorkItems,
  (workItemId, date, overview) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const closedAt = new Date(overview.wiMeta[workItemId].end!);
    const dateEnd = new Date(date);
    dateEnd.setDate(date.getDate() + 1);
    return closedAt.getTime() >= date.getTime() && closedAt.getTime() < dateEnd.getTime();
  }
);

const colorPalette = [
  '#b3b300', '#ffa500', '#ff0000', '#ff00ff',
  '#a862ea', '#134e6f', '#4d4dff', '#9999ff',
  '#00b300', '#b30000'
];

const colorCache = new Map<string, string>();

const widsInGroup = (workItems: ReturnType<typeof getClosedWorkItemsForGraph>[number]['workItems']) => (
  workItems.flatMap(({ workItemIds }) => workItemIds)
);

type LegendSidebarProps = {
  heading: ReactNode;
  headlineStatValue: ReactNode;
  headlineStatUnits?: ReactNode;
  data: ReturnType<typeof getClosedWorkItemsForGraph>;
  projectAnalysis: ProjectOverviewAnalysis;
  lineColor: ({ witId, groupName }: { witId: string; groupName: string }) => string;
  childStat: (workItemIds: number[]) => ReactNode;
};

const LegendSidebar: React.FC<LegendSidebarProps> = ({
  heading, headlineStatValue, headlineStatUnits, data,
  projectAnalysis, lineColor, childStat
}) => (
  <div>
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
        <div
          key={witId + groupName}
          className="p-2 shadow rounded-md"
          style={{
            borderLeft: `4px solid ${lineColor({ witId, groupName })}`
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
            {childStat(workItems.reduce<number[]>((a, wi) => a.concat(wi.workItemIds), []))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const FlowVelocity: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const organizedClosedWorkItemsByDate = useMemo(
    () => splitOrganizedWorkItemsByDate(
      projectAnalysis,
      organizedClosedWorkItems(projectAnalysis.overview),
      (workItemId, date) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const closedAt = new Date(projectAnalysis.overview.wiMeta[workItemId].end!);
        const dateEnd = new Date(date);
        dateEnd.setDate(date.getDate() + 1);
        return closedAt.getTime() >= date.getTime() && closedAt.getTime() < dateEnd.getTime();
      }
    ),
    [projectAnalysis]
  );

  const organizedOpenWorkItems = useMemo(
    () => organizedWipWorkItems(projectAnalysis.overview),
    [projectAnalysis]
  );

  const closedWorkItemsForGraph = useMemo(
    () => getClosedWorkItemsForGraph(projectAnalysis),
    [projectAnalysis]
  );

  const cycleTime = useMemo(() => cycleTimeFor(projectAnalysis.overview), [projectAnalysis]);
  const totalCycleTime = useMemo(() => totalCycleTimeUsing(cycleTime), [cycleTime]);
  const totalWorkCenterTime = useMemo(() => [
    (acc: number, wid: number) => acc + totalWorkCenterTimeUsing(projectAnalysis.overview)(wid),
    0
  ] as const, [projectAnalysis]);

  const lineColor = useCallback(({ witId, groupName }: { witId: string; groupName: string }) => {
    if (!colorCache.has(witId + groupName)) {
      colorCache.set(witId + groupName, colorPalette[colorCache.size % colorPalette.length]);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return colorCache.get(witId + groupName)!;
  }, []);

  const groupLabel = useCallback(({ witId, groupName }: { witId: string; groupName: string }) => (
    projectAnalysis.overview.types[witId].name[1]
      + (groupName === noGroup ? '' : ` - ${groupName}`)
  ), [projectAnalysis.overview.types]);

  type ClosedWILine = typeof closedWorkItemsForGraph[number];
  type ClosedWIPoint = typeof closedWorkItemsForGraph[number]['workItems'][number];

  return (
    <div>
      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <h1 className="text-2xl font-semibold">
          Velocity
        </h1>
        <p className="text-base text-gray-600 mb-4">
          Work items closed per day over the last month
        </p>
        <div className="grid gap-8 grid-flow-col">
          <LineGraph<ClosedWILine, ClosedWIPoint>
            lines={closedWorkItemsForGraph}
            points={x => x.workItems}
            pointToValue={x => x.workItemIds.length}
            lineColor={lineColor}
            yAxisLabel={x => String(x)}
            lineLabel={groupLabel}
            xAxisLabel={x => shortDate(x.date)}
          />
          <LegendSidebar
            heading="Velocity this month"
            headlineStatValue={closedWorkItemsForGraph.reduce((acc, { workItems }) => (
              acc + widsInGroup(workItems).length
            ), 0)}
            headlineStatUnits="work items"
            data={closedWorkItemsForGraph}
            projectAnalysis={projectAnalysis}
            lineColor={lineColor}
            childStat={length}
          />
        </div>
      </div>

      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <h1 className="text-2xl">
          Average cycle time
        </h1>
        <p className="text-base text-gray-600 mb-4">
          Average time taken to complete a work item
        </p>
        <div className="grid gap-8 grid-flow-col">
          <LineGraph<ClosedWILine, ClosedWIPoint>
            lines={closedWorkItemsForGraph}
            points={prop('workItems')}
            pointToValue={group => (
              group.workItemIds.length
                ? group.workItemIds.reduce(...totalCycleTime) / group.workItemIds.length
                : 0
            )}
            lineColor={lineColor}
            yAxisLabel={x => prettyMilliseconds(x, { compact: true })}
            lineLabel={groupLabel}
            xAxisLabel={x => shortDate(x.date)}
          />
          <LegendSidebar
            heading="Overall average cycle time"
            headlineStatValue={(() => {
              const allWids = closedWorkItemsForGraph.reduce(...allWorkItemIds);

              return allWids.length
                ? prettyMilliseconds(
                  allWids.reduce(...totalCycleTime) / allWids.length,
                  { compact: true }
                )
                : '-';
            })()}
            data={closedWorkItemsForGraph}
            projectAnalysis={projectAnalysis}
            lineColor={lineColor}
            childStat={wids => (
              wids.length
                ? prettyMilliseconds(
                  wids.reduce(...totalCycleTime) / wids.length,
                  { compact: true }
                )
                : '-'
            )}
          />
        </div>
      </div>

      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <h1 className="text-2xl">
          Flow efficiency
        </h1>
        <p className="text-base text-gray-600 mb-4">
          Time spent working vs waiting
        </p>
        <div className="grid gap-8 grid-flow-col">
          <LineGraph<ClosedWILine, ClosedWIPoint>
            lines={closedWorkItemsForGraph}
            points={x => x.workItems}
            pointToValue={group => {
              const workTime = group.workItemIds.reduce(...totalWorkCenterTime);
              const totalTime = group.workItemIds.reduce(...totalCycleTime);

              return totalTime === 0 ? 0 : (workTime * 100) / totalTime;
            }}
            lineColor={lineColor}
            yAxisLabel={x => (x === 0 ? 'na' : `${x.toFixed(2)}%`)}
            lineLabel={groupLabel}
            xAxisLabel={x => shortDate(x.date)}
          />
          <LegendSidebar
            heading="Overall flow efficiency"
            headlineStatValue={(() => {
              const allWids = closedWorkItemsForGraph.reduce<number[]>(
                (acc, { workItems }) => acc.concat(widsInGroup(workItems)),
                []
              );
              const cycleTime = allWids.reduce(...totalCycleTime);

              return cycleTime
                ? Math.round((allWids.reduce(...totalWorkCenterTime) * 100) / cycleTime)
                : 0;
            })()}
            headlineStatUnits="%"
            data={closedWorkItemsForGraph}
            projectAnalysis={projectAnalysis}
            lineColor={lineColor}
            childStat={wids => {
              const cycleTime = wids.reduce(...totalCycleTime);

              return cycleTime
                ? `${Math.round(
                  (wids.reduce(...totalWorkCenterTime) * 100)
                    / cycleTime
                )}%`
                : '-';
            }}
          />
        </div>
      </div>

      <div className="border-b-2 border-black mt-20">
        <h2 className="font-bold">WIP work items</h2>
        {Object.entries(organizedOpenWorkItems).map(([witId, group]) => (
          Object.entries(group).map(([groupName, workItemIds]) => (
            <div key={witId + groupName}>
              <strong className="font-bold">
                {groupLabel({ witId, groupName })}
              </strong>
              {workItemIds.length}
              {' '}
              <small>
                {workItemIds.map((workItemId, index) => (
                  <Fragment key={workItemId}>
                    <a
                      href={projectAnalysis.overview.byId[workItemId].url}
                      className="text-blue-700 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {workItemId}
                    </a>
                    {index !== workItemIds.length - 1 ? ', ' : ''}
                  </Fragment>
                ))}
              </small>
            </div>
          ))
        ))}
      </div>

      <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
        {displayTable(
          projectAnalysis,
          organizedClosedWorkItemsByDate,
          'Velocity - Count of completed work items per day',
          group => (
            <>
              {group.workItemIds.length}
              <br />
              {group.workItemIds.map((workItemId, index) => (
                <Fragment key={workItemId}>
                  <a
                    href={projectAnalysis.overview.byId[workItemId].url}
                    className="text-blue-700 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {workItemId}
                  </a>
                  {index < group.workItemIds.length - 1 ? ', ' : ''}
                </Fragment>
              ))}
            </>
          )
        )}
        {displayTable(
          projectAnalysis,
          organizedClosedWorkItemsByDate,
          'Average cycle time - avg(end time - start time) for completed work items',
          group => (
            group.workItemIds.length
              ? prettyMilliseconds(
                group.workItemIds.reduce(...totalCycleTime) / group.workItemIds.length,
                { compact: true }
              )
              : 0
          )
        )}
        {displayTable(
          projectAnalysis,
          organizedClosedWorkItemsByDate,
          'Flow efficiency - work time / (end time - start time) for completed work items',
          group => {
            const workTime = group.workItemIds.reduce(...totalWorkCenterTime);
            const totalTime = group.workItemIds.reduce(...totalCycleTime);

            return totalTime === 0 ? 'na' : `${((workTime * 100) / totalTime).toFixed(2)}%`;
          }
        )}
      </div>
    </div>
  );
};

export default FlowVelocity;
