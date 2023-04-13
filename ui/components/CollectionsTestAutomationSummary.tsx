import React from 'react';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';

const CollectionsTestAutomationSummary: React.FC<{
  collectionName: string;
}> = ({ collectionName }) => {
  const collectionSummary = trpc.summary.getCollectionSummary.useQuery({
    collectionName,
  });

  return (
    <div>
      {!collectionSummary.data && <div>Loading...</div>}

      {collectionSummary.data && collectionSummary.data.length === 0 && (
        <div>No Projects In This Collection</div>
      )}

      {collectionSummary.data && collectionSummary.data.length > 0 && (
        <table className="table-auto">
          <thead className="bg-gray-800 text-white uppercase">
            <tr>
              <th className="text-xs font-semibold px-4 py-4">Sr.No</th>
              <th className="text-xs font-semibold px-4 py-4 text-left">Project Name</th>
              <th className="text-xs font-semibold px-4 py-4">Total Tests</th>
              <th className="text-xs font-semibold px-4 py-4">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.map((project, index) => (
              <tr key={project.project}>
                <td className="text-center border px-4 py-2">{index + 1}</td>
                <td className="border px-4 py-2">
                  <div className="text-sm font-semibold">{project.project}</div>
                  <div className="text-gray-700 text-xs py-1">
                    Analyzed
                    <span className="text-gray-800 font-semibold">
                      {` ${project.totalActiveRepos} `}
                    </span>
                    active repositories and excluded{' '}
                    <span className="text-gray-800 font-semibold">
                      {` ${project.totalRepos - project.totalActiveRepos || 0} `}
                    </span>
                    inactive repositories
                  </div>
                </td>
                <td className="text-center border px-4 py-2">
                  {project.latestTestsSummary.totalTests}
                </td>
                <td className="text-center border px-4 py-2">
                  {divide(
                    project.latestCoverageSummary.coveredBranches ?? 0,
                    project.latestCoverageSummary.totalBranches ?? 0
                  )
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

export default CollectionsTestAutomationSummary;
