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

const getVelocity = (overview: ProjectOverviewAnalysis['overview']) => {
  const witId = witIdCreator(overview);
  const group = groupCreator(overview);

  return Object.keys(overview.closed)
    .map(Number)
    .reduce<Record<string, Record<string, number[]>>>(
      (acc, workItemId) => {
        acc[witId(workItemId)] = acc[witId(workItemId)] || {};
        acc[witId(workItemId)][group(workItemId)?.name || noGroup] = (
          acc[witId(workItemId)][group(workItemId)?.name || noGroup] || []
        ).concat(workItemId);

        return acc;
      }, {}
    );
};

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
