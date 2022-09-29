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
    <div className="grid grid-flow-col gap-5 p-5 bg-gray-100">
      <div>
        <h3 className="font-semibold text-lg">Slowest tasks</h3>
        <p className="text-gray-500 text-sm mb-2">Slowest tasks that have taken longer than 30 seconds</p>
        {timelineStats.data?.slowest.length === 0
          ? (
            <div className="italic text-gray-500">
              Couldn't find builds in the last
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
                  <th className="text-center">Average time</th>
                </tr>
              </thead>
              <tbody>
                {timelineStats.data?.slowest.map(task => (
                  <tr key={task.name}>
                    <td>{task.name}</td>
                    <td>{prettyMilliseconds(task.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

          )}
      </div>
      <div>
        <h3 className="font-semibold text-lg">Frequently failing tasks</h3>
        <p className="text-gray-500 text-sm mb-2">Tasks that have a failure rate greater than 5%</p>
        {timelineStats.data?.failing.length === 0
          ? (
            <div className="italic text-gray-500">
              Couldn't find builds in the last
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
                  <th className="text-center">Failure rate</th>
                </tr>
              </thead>
              <tbody>
                {timelineStats.data?.failing.map(task => (
                  <tr key={task.name}>
                    <td>
                      {task.name}
                      {task.continueOnError
                        ? (
                          <span
                            className="bg-orange-500 rounded-full w-2 h-2 inline-block ml-2"
                            data-tip="This task is configured to continue on error"
                          />
                        )
                        : null}
                    </td>
                    <td>
                      {(task.errorCount * 100).toFixed(2)}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          )}
      </div>
      <div>
        <h3 className="font-semibold text-lg">Frequently skipped</h3>
        <p className="text-gray-500 text-sm mb-2">Items that are skipped frequently</p>
        {timelineStats.data?.skipped.length === 0
          ? (
            <div className="italic text-gray-500">
              Couldn't find builds in the last
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
                  <th className="text-center">Skip rate</th>
                </tr>
              </thead>
              <tbody>
                {timelineStats.data?.skipped.map(task => (
                  <tr key={task.name}>
                    <td>
                      {task.name}
                    </td>
                    <td>
                      {(task.skippedPercentage * 100).toFixed(2)}
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
