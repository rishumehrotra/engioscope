import React from 'react';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';
import Loading from './Loading.jsx';

const CollectionsReleasesSummary: React.FC<{
  collectionName: string;
  opened: boolean;
}> = ({ collectionName, opened }) => {
  const collectionSummary = trpc.summary.getCollectionReleasesSummary.useQuery(
    { collectionName },
    { enabled: opened }
  );

  if (!collectionSummary.data) {
    return (
      <div className="py-2">
        <Loading />
      </div>
    );
  }

  return (
    <div className="py-2">
      {collectionSummary.data.length === 0 ? (
        <div>No Projects In This Collection</div>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th className="left">Project</th>
              <th>Master-only releases </th>
              <th>Starts with artifact</th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.map(project => (
              <tr key={project.project}>
                <td className="left">
                  <div className="text-base font-semibold">{project.project}</div>
                  {/* <div className="text-gray-700 text-sm py-1">
                    Analyzed
                    <span className="text-gray-800 font-semibold">
                      {` ${project.totalActiveRepos} `}
                    </span>
                    active repositories and excluded{' '}
                    <span className="text-gray-800 font-semibold">
                      {` ${project.totalRepos - project.totalActiveRepos || 0} `}
                    </span>
                    inactive repositories
                  </div> */}
                </td>

                <td>
                  {divide(project.masterOnly ?? 0, project.runCount ?? 0)
                    .map(toPercentage)
                    .getOr('-')}
                </td>
                <td>
                  {divide(project.startsWithArtifact ?? 0, project.pipelineCount ?? 0)
                    .map(toPercentage)
                    .getOr('-')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CollectionsReleasesSummary;
