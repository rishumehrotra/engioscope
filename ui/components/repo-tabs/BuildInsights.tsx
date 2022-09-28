import prettyMilliseconds from 'pretty-ms';
import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { useProjectDetails } from '../../hooks/project-details-hooks.jsx';
import Loading from '../Loading.jsx';

const BuildInsightsInternal: React.FC<{
  collectionName: string;
  project: string;
  buildDefinitionId: number;
  queryPeriodDays: number;
}> = ({
  collectionName, project, buildDefinitionId, queryPeriodDays
}) => {
  const timelineStats = trpc.builds.timelineStats.useQuery({
    collectionName, project, buildDefinitionId
  });

  if (timelineStats.isLoading) return <Loading />;

  return (
    <div className="grid grid-flow-col gap-5 p-5">
      <div>
        <h3 className="font-semibold text-lg mb-2">🐢 Slowest tasks</h3>
        {timelineStats.data?.worstTime.length === 0
          ? (
            <div className="italic text-gray-500">
              Couldn't find any data in the last
              {' '}
              {queryPeriodDays}
              {' '}
              days
            </div>
          )
          : (
            <table>
              <thead>
                <tr>
                  <th> </th>
                  <th className="text-center w-1">Average time</th>
                </tr>
              </thead>
              <tbody>
                {timelineStats.data?.worstTime.map(items => (
                  <tr key={items.name}>
                    <td>{items.name}</td>
                    <td>{prettyMilliseconds(items.averageTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

          )}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">💣 Frequently failing tasks</h3>
        {timelineStats.data?.worstTime.length === 0
          ? (
            <div className="italic text-gray-500">
              Couldn't find any data in the last
              {' '}
              {queryPeriodDays}
              {' '}
              days
            </div>
          )
          : (
            <table>
              <thead>
                <tr>
                  <th> </th>
                  <th className="text-center w-1">Failure rate</th>
                </tr>
              </thead>
              <tbody>
                {timelineStats.data?.worstErrors.map(items => (
                  <tr key={items.name}>
                    <td>{items.name}</td>
                    <td>
                      {(items.errorCount * 100).toFixed(2)}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          )}
      </div>
    </div>
  );
};

const BuildInsights: React.FC<{url: string}> = ({ url }) => {
  const projectDetails = useProjectDetails();

  if (!projectDetails) return null;

  return (
    <BuildInsightsInternal
      collectionName={projectDetails.name[0]}
      project={projectDetails.name[1]}
      buildDefinitionId={Number(url.split('=')[1])}
      queryPeriodDays={projectDetails.queryPeriodDays}
    />
  );
};

export default BuildInsights;
