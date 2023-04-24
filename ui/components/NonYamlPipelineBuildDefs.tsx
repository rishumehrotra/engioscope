import React from 'react';
import { trpc } from '../helpers/trpc.js';
import { num, shortDate } from '../helpers/utils.js';
import { useQueryContext } from '../hooks/query-hooks.js';

const NonYamlPipelineBuildDefs: React.FC<{
  repositoryId: string;
  queryPeriodDays: number;
}> = ({ repositoryId, queryPeriodDays }) => {
  const buildDefStats = trpc.builds.getNonYamlPipeLineBuildStats.useQuery({
    queryContext: useQueryContext(),
    repositoryId,
  });

  if (!buildDefStats.data) return null;

  return (
    <div className="bg-gray-100 pt-2 pb-4 px-4 rounded-lg mt-4">
      <table className="table-auto text-center divide-y divide-gray-200 w-full">
        <thead>
          <tr>
            <th className="px-6 py-3 text-xs w-2/6 font-medium text-gray-800 uppercase tracking-wider text-left">
              Name
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
              {`Runs in the last ${queryPeriodDays} days`}
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
              Last used
            </th>
          </tr>
        </thead>
        <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
          {buildDefStats.data.map(pipeline => (
            <tr key={pipeline.definitionName}>
              <td className="pl-6 py-4 whitespace-nowrap text-left">
                <a
                  href={pipeline.definitionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-text"
                >
                  {pipeline.definitionName}
                </a>
              </td>
              <td>{pipeline.buildsCount === 0 ? '-' : num(pipeline.buildsCount)}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {pipeline.latestBuildTimestamp
                  ? `${shortDate(new Date(pipeline.latestBuildTimestamp))}, ${new Date(
                      pipeline.latestBuildTimestamp
                    ).getFullYear()}`
                  : '_'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NonYamlPipelineBuildDefs;
