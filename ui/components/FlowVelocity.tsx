import prettyMilliseconds from 'pretty-ms';
import { range } from 'rambda';
import React, { Fragment, useMemo } from 'react';
import type { Overview, ProjectOverviewAnalysis } from '../../shared/types';

const groupCreator = (overview: ProjectOverviewAnalysis['overview']) => (
  (workItemId: number) => {
    const { groupId } = overview.byId[workItemId];
    return groupId ? overview.groups[groupId] : undefined;
  }
);

const witIdCreator = (overview: ProjectOverviewAnalysis['overview']) => (
  (workItemId: number) => overview.byId[workItemId].typeId
);

const noGroup = 'no-group';

const closedWorkItemIds = (overview: Overview) => (
  Object.entries(overview.wiMeta)
    .filter(([, meta]) => meta.end)
    .map(([id]) => Number(id))
);

const organizeWorkItems = (workItemIds: (overview: Overview) => number[]) => (
  (overview: ProjectOverviewAnalysis['overview']) => {
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
const organizedWipWorkItems = organizeWorkItems(overview => (
  Object.entries(overview.wiMeta)
    .filter(([, meta]) => !meta.end)
    .map(([id]) => Number(id))
));

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
                workItemIds: workItemIds.filter(workItemId => filterWorkItems(workItemId, date))
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

  // const areaGraphData = useMemo(() => organizedWorkItemsByDate.map(({ date, items: velocity }) => ({
  //   yAxisValue: date.toLocaleDateString(),
  //   points: velocity.map(item => ({
  //     label: `${projectAnalysis.overview.types[item.witId].name[1]}${item.groupName === noGroup ? '' : ` - ${item.groupName}`}`,
  //     value: item.workItemIds.length
  //   }))
  // })), [projectAnalysis.overview.types, organizedWorkItemsByDate]);

  return (
    <div>
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
