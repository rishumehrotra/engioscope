import { range } from 'rambda';
import React, { useMemo } from 'react';
import type { ProjectOverviewAnalysis, Overview } from '../../shared/types';

const featureTypeCreator = (overview: ProjectOverviewAnalysis['overview']) => (
  (workItemId: number): string | undefined => overview.featureTypes[workItemId]
);

const witIdCreator = (overview: ProjectOverviewAnalysis['overview']) => (
  (workItemId: number) => overview.byId[workItemId].typeId
);

const noGroup = 'no-group';

const groupNameCreator = (overview: Overview) => {
  const featureType = featureTypeCreator(overview);

  return (workItemId: number) => featureType(workItemId)
    || overview.byId[workItemId].env
    || noGroup;
};

const getVelocity = (overview: ProjectOverviewAnalysis['overview']) => {
  const witId = witIdCreator(overview);
  const groupName = groupNameCreator(overview);

  return Object.keys(overview.closed)
    .map(Number)
    .reduce<Record<string, Record<string, number[]>>>(
      (acc, workItemId) => {
        acc[witId(workItemId)] = acc[witId(workItemId)] || {};
        acc[witId(workItemId)][groupName(workItemId)] = (
          acc[witId(workItemId)][groupName(workItemId)] || []
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

  return (
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
                  <li>
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
  );
};

export default FlowVelocity;
