import React from 'react';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';

const CollectionSummaryTable: React.FC<{
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
              <th className="text-xs font-semibold px-4 py-4">Total Pipelines</th>
              <th className="text-xs font-semibold px-4 py-4">Pipelines Running Tests</th>
              <th className="text-xs font-semibold px-4 py-4">
                Pipelines Reporting Coverages
              </th>
              <th className="text-xs font-semibold px-4 py-4">Total Builds</th>
              <th className="text-xs font-semibold px-4 py-4">Successful Builds</th>
              <th className="text-xs font-semibold px-4 py-4">Total Branches</th>
              <th className="text-xs font-semibold px-4 py-4">Healthy Branches</th>
              <th className="text-xs font-semibold px-4 py-4">Active Repository</th>
              <th className="text-xs font-semibold px-4 py-4">Has Releases</th>
              <th className="text-xs font-semibold px-4 py-4">YAML Pipelines</th>
              <th className="text-xs font-semibold px-4 py-4">Central Template Usage</th>
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
                <td className="text-center border px-4 py-2">
                  {project.totalDefs ?? '-'}
                </td>
                <td className="text-center border px-4 py-2">
                  {project.defsWithTests ?? '-'}
                </td>
                <td className="text-center border px-4 py-2">
                  {project.defsWithCoverage ?? '-'}
                </td>
                <td className="text-center border px-4 py-2">
                  {project.totalBuilds.count ?? '-'}
                </td>
                <td className="text-center border px-4 py-2">
                  {divide(
                    project.successfulBuilds.count ?? 0,
                    project.totalBuilds.count ?? 0
                  )
                    .map(toPercentage)
                    .getOr('-')}
                </td>
                <td className="text-center border px-4 py-2">
                  {project.healthyBranches.total ?? '-'}
                </td>
                <td className="text-center border px-4 py-2">
                  {divide(
                    project.healthyBranches.healthy ?? 0,
                    project.healthyBranches.total ?? 0
                  )
                    .map(toPercentage)
                    .getOr('-')}
                </td>
                <td className="text-center border px-4 py-2">
                  {project.totalActiveRepos ?? '-'}
                </td>
                <td className="text-center border px-4 py-2">
                  {divide(
                    project.hasReleasesReposCount ?? 0,
                    project.totalActiveRepos ?? 0
                  )
                    .map(toPercentage)
                    .getOr('-')}
                </td>
                <td className="text-center border px-4 py-2">
                  {project.pipelines.yamlCount ?? '-'}
                </td>
                <td className="text-center border px-4 py-2">
                  {project.centralTemplatePipeline.central ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CollectionSummaryTable;
