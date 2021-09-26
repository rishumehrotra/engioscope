import { range } from 'rambda';
import React, { useMemo } from 'react';
import type { ProjectOverviewAnalysis } from '../../shared/types';
import AreaGraph from './graphs/AreaGraph';

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

const organizeClosedWorkItems = <T extends unknown>(
  initialValue: T,
  combine: (acc: T, workItemId: number, overview: ProjectOverviewAnalysis['overview']) => T
) => (
  (overview: ProjectOverviewAnalysis['overview']) => {
    const witId = witIdCreator(overview);
    const group = groupCreator(overview);

    return Object.entries(overview.wiMeta)
      .filter(([, meta]) => meta.end)
      .map(([id]) => Number(id))
      .reduce<Record<string, Record<string, T>>>(
        (acc, workItemId) => {
          acc[witId(workItemId)] = acc[witId(workItemId)] || {};

          acc[witId(workItemId)][group(workItemId)?.name || noGroup] = combine(
            acc[witId(workItemId)][group(workItemId)?.name || noGroup] || initialValue,
            workItemId,
            overview
          );

          return acc;
        }, {}
      );
  }
);

const getVelocity = organizeClosedWorkItems<number[]>([], (acc, wid) => acc.concat(wid));
const cycleTime = organizeClosedWorkItems<number[]>([], (acc, wid, overview) => {
  const { start, end } = overview.wiMeta[wid];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return acc.concat(new Date(end!).getTime() - new Date(start).getTime());
});

const splitVelocityByDate = (
  projectAnalysis: ProjectOverviewAnalysis,
  velocity: ReturnType<typeof getVelocity>
) => {
  const { lastUpdated, overview: { closed } } = projectAnalysis;

  return (
    range(0, 31).map(day => {
      // TODO: FIXME Bad hack of hardcoded 2021
      const date = new Date(`${lastUpdated} 2021`);
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      return {
        date,
        velocity: Object.entries(velocity)
          .flatMap(([witId, groupName]) => (
            Object.entries(groupName)
              .flatMap(([groupName, workItemIds]) => ({
                witId,
                groupName,
                workItemIds: workItemIds.filter(workItemId => {
                  const closedAt = new Date(closed[workItemId]);
                  const dateEnd = new Date(date);
                  dateEnd.setDate(date.getDate() + 1);
                  return closedAt.getTime() >= date.getTime() && closedAt.getTime() < dateEnd.getTime();
                })
              }))
          ))
      };
    }).reverse()
  );
};

const FlowVelocity: React.FC<{ projectAnalysis: ProjectOverviewAnalysis }> = ({ projectAnalysis }) => {
  const velocityByDate = useMemo(
    () => splitVelocityByDate(projectAnalysis, getVelocity(projectAnalysis.overview)),
    [projectAnalysis]
  );

  const areaGraphData = useMemo(() => velocityByDate.map(({ date, velocity }) => ({
    yAxisValue: date.toLocaleDateString(),
    points: velocity.map(item => ({
      label: `${projectAnalysis.overview.types[item.witId].name[1]}${item.groupName === noGroup ? '' : ` - ${item.groupName}`}`,
      value: item.workItemIds.length
    }))
  })), [projectAnalysis.overview.types, velocityByDate]);

  console.log(cycleTime(projectAnalysis.overview));

  return (
    <div className="flex">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Velocity</th>
          </tr>
        </thead>
        <tbody>
          {velocityByDate.map(({ date, velocity }) => (
            <tr key={date.toISOString()} className="border-b-2 border-black">
              <td>{date.toLocaleDateString()}</td>
              <td>
                <ul>
                  {velocity.map(item => (
                    <li key={item.groupName}>
                      {`${
                        projectAnalysis.overview.types[item.witId].name[1]
                      }${
                        item.groupName === noGroup ? '' : ` - ${item.groupName}`
                      }: ${item.workItemIds.length}`}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <AreaGraph
          className="w-auto"
          graphData={areaGraphData}
          pointToValue={x => x.value}
        />
      </div>
    </div>
  );
};

export default FlowVelocity;
