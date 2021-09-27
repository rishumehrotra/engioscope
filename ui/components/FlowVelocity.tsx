import prettyMilliseconds from 'pretty-ms';
import { not, pipe, range } from 'rambda';
import React, { Fragment, useCallback, useMemo } from 'react';
import type { Overview, ProjectOverviewAnalysis } from '../../shared/types';
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

const isWorkItemClosed = (workItemMeta: Overview['wiMeta'][number]) => Boolean(workItemMeta.end);
const isWorkItemOpen = pipe(isWorkItemClosed, not);

const getWorkItemIdsUsingMeta = (pred: (workItemMeta: Overview['wiMeta'][number]) => boolean) => (
  (overview: Overview) => (
    Object.entries(overview.wiMeta)
      .filter(([, meta]) => pred(meta))
      .map(([id]) => Number(id))
  )
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
  value: (item: ReturnType<typeof splitOrganizedWorkItemsByDate>[number]['items'][number]) => any
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
  '#2ab7ca', '#fed766', '#fe8a71', '#96ceb4',
  '#ff6f69', '#00b159', '#fe4a49'
];

const colorCache = new Map<string, string>();

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

  const lineColor = useCallback(({ witId, groupName }: { witId: string; groupName: string }) => {
    if (!colorCache.has(witId + groupName)) {
      colorCache.set(witId + groupName, colorPalette[colorCache.size % colorPalette.length]);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return colorCache.get(witId + groupName)!;
  }, []);

  console.log({ closedWorkItemsForGraph });

  type ClosedWILine = typeof closedWorkItemsForGraph[number];
  type ClosedWIPoint = typeof closedWorkItemsForGraph[number]['workItems'][number];

  return (
    <div>
      <LineGraph<ClosedWILine, ClosedWIPoint>
        lines={closedWorkItemsForGraph}
        points={x => x.workItems}
        pointToValue={x => x.workItemIds.length}
        lineColor={lineColor}
        yAxisLabel={x => String(x)}
        lineLabel={x => (
          projectAnalysis.overview.types[x.witId].name[1]
          + (x.groupName === noGroup ? '' : ` - ${x.groupName}`)
        )}
      />
      <div className="border-b-2 border-black">
        <h2 className="font-bold">WIP work items</h2>
        {Object.entries(organizedOpenWorkItems).map(([witId, group]) => (
          Object.entries(group).map(([groupName, workItemIds]) => (
            <div key={witId + groupName}>
              <strong className="font-bold">
                {`${projectAnalysis.overview.types[witId].name[1]}${groupName === noGroup ? '' : ` - ${groupName}`}: `}
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
                <>
                  <a
                    href={projectAnalysis.overview.byId[workItemId].url}
                    className="text-blue-700 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {workItemId}
                  </a>
                  {index < group.workItemIds.length - 1 ? ', ' : ''}
                </>
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
              ? prettyMilliseconds(group.workItemIds.reduce((acc, wid) => (
                acc + (
                  new Date(projectAnalysis.overview.wiMeta[wid].end!).getTime()
                - new Date(projectAnalysis.overview.wiMeta[wid].start).getTime()
                )
              ), 0) / group.workItemIds.length, { compact: true })
              : 0
          )
        )}
        {displayTable(
          projectAnalysis,
          organizedClosedWorkItemsByDate,
          'Flow efficiency - work time / (end time - start time) for completed work items',
          group => {
            const workTime = group.workItemIds.reduce((acc, wid) => (
              acc + projectAnalysis.overview.wiMeta[wid].workCenters.reduce((a, wc) => (
                a + wc.time
              ), 0)
            ), 0);

            const totalTime = group.workItemIds.reduce((acc, wid) => (
              acc + (
                new Date(projectAnalysis.overview.wiMeta[wid].end!).getTime()
              - new Date(projectAnalysis.overview.wiMeta[wid].start).getTime()
              )
            ), 0);

            return totalTime === 0 ? 'na' : `${((workTime * 100) / totalTime).toFixed(2)}%`;
          }
        )}
        {/* <div>
        <AreaGraph
          className="w-auto"
          graphData={areaGraphData}
          pointToValue={x => x.value}
        />
      </div> */}
      </div>
    </div>
  );
};

export default FlowVelocity;
