import prettyMilliseconds from 'pretty-ms';
import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import Loading from '../Loading.jsx';
import useQueryPeriodDays from '../../hooks/use-query-period-days.js';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import { toPercentage } from '../../../shared/utils.js';

const BuildInsights: React.FC<{
  buildDefinitionId: number;
}> = ({ buildDefinitionId }) => {
  const cnp = useCollectionAndProject();
  const timelineStats = trpc.builds.timelineStats.useQuery({
    ...cnp,
    buildDefinitionId,
  });
  const [queryPeriodDays] = useQueryPeriodDays();

  if (!timelineStats.data) return <Loading />;

  if (timelineStats.data.count === 0) {
    return (
      <div className="bg-gray-100">
        Couldn't find any data for the last {queryPeriodDays} days
      </div>
    );
  }

  return (
    <div className="grid grid-flow-col gap-5 p-5 bg-gray-100">
      <div>
        <h3 className="font-semibold text-lg">Slowest tasks</h3>
        <p className="text-gray-500 text-sm mb-2">
          Slowest tasks that have taken longer than 30 seconds
        </p>
        {timelineStats.data?.slowest.length === 0 ? (
          <div className="italic text-gray-500">
            No tasks took longer than 30s to complete
          </div>
        ) : (
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
        <p className="text-gray-500 text-sm mb-2">
          Tasks that have a failure rate greater than 5%
        </p>
        {timelineStats.data?.failing.length === 0 ? (
          <div className="italic text-gray-500">
            No task had a significant failure rate in the last {queryPeriodDays} days
          </div>
        ) : (
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
                    {task.continueOnError ? (
                      <span
                        className="bg-orange-500 rounded-full w-2 h-2 inline-block ml-2"
                        data-tooltip-id="react-tooltip"
                        data-tooltip-content="This task is configured to continue on error"
                      />
                    ) : null}
                  </td>
                  <td>{toPercentage(task.failureRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-lg">Frequently skipped</h3>
        <p className="text-gray-500 text-sm mb-2">Items that are skipped frequently</p>
        {timelineStats.data?.skipped.length === 0 ? (
          <div className="italic text-gray-500">
            No tasks were skipped in the last {queryPeriodDays} days
          </div>
        ) : (
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
                  <td>{task.name}</td>
                  <td>{(task.skippedPercentage * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BuildInsights;
