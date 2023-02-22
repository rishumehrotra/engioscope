import React, { useState } from 'react';
import { trpc } from '../helpers/trpc.js';
import { num, shortDate } from '../helpers/utils.js';
import { useDateRange } from '../hooks/date-range-hooks.jsx';
import { useProjectDetails } from '../hooks/project-details-hooks.jsx';

type nonYamlPipelineDetails = {
  repositoryId: string;
  name: string;
  total: number;
};

type NonYamlPipeLineBuildProps = {
  nonYamlRepos: nonYamlPipelineDetails[];
  queryPeriodDays: number;
};

const NonYamlPipeLineBuilds: React.FC<NonYamlPipeLineBuildProps> = ({
  nonYamlRepos,
  queryPeriodDays,
}) => {
  const projectDetails = useProjectDetails()!;
  const dateRange = useDateRange();
  const [currentRepoId, setCurrentRepoId] = useState(nonYamlRepos[0].repositoryId);
  const buildDefStats = trpc.builds.getNonYamlPipeLineBuildStats.useQuery({
    collectionName: projectDetails.name[0],
    project: projectDetails.name[1],
    repositoryId: currentRepoId,
    ...dateRange,
  });

  if (!nonYamlRepos) {
    return null;
  }

  return (
    <>
      {nonYamlRepos.map((repo, index) => {
        return (
          <details
            key={repo.repositoryId}
            className="mb-3"
            open={index === 0}
            onToggle={() => {
              setCurrentRepoId(repo.repositoryId);
            }}
          >
            <summary className="font-semibold text-lg cursor-pointer">
              {`${repo.name} (${repo.total})`}
            </summary>

            <div className="bg-gray-100 pt-2 pb-4 px-4 rounded-lg mt-4">
              <table className="table-auto text-center divide-y divide-gray-200 w-full">
                <thead>
                  <tr>
                    {}
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
                  {buildDefStats.data
                    ? buildDefStats.data.map(pipeline => (
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
                          <td>
                            {/* {pipeline.latestBuildResult === 'unused'
                                  ? '-'
                                  : num(pipeline.buildsCount)} */}
                            {pipeline.buildsCount === 0 ? '-' : num(pipeline.buildsCount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pipeline.latestBuildTimestamp
                              ? `${shortDate(
                                  new Date(pipeline.latestBuildTimestamp)
                                )}, ${new Date(
                                  pipeline.latestBuildTimestamp
                                ).getFullYear()}`
                              : '_'}
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </>
  );
};

export default NonYamlPipeLineBuilds;
