import React from 'react';
import { multiply } from 'rambda';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { LabelWithSparkline } from './graphs/Sparkline.jsx';
import { increaseIsBetter } from './summary-page/utils.jsx';

const CollectionsTestAutomationSummary: React.FC<{
  collectionName: string;
}> = ({ collectionName }) => {
  const collectionSummary = trpc.summary.getCollectionTestAutomationSummary.useQuery({
    collectionName,
  });

  return (
    <div className="py-2">
      {!collectionSummary.data && <div>Loading...</div>}

      {collectionSummary.data && collectionSummary.data.length === 0 && (
        <div>No Projects In This Collection</div>
      )}

      {collectionSummary.data && collectionSummary.data.length > 0 && (
        <table className="summary-table">
          <thead className="bg-gray-800 text-white uppercase">
            <tr>
              <th className="text-sm font-semibold px-4 py-4">Sr.No</th>
              <th className="text-sm font-semibold px-4 py-4 text-left">Project Name</th>
              <th className="text-sm font-semibold px-4 py-4">Total Tests</th>
              <th className="text-sm font-semibold px-4 py-4">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.map((project, index) => (
              <tr key={project.project}>
                <td className="text-center border px-4 py-2">{index + 1}</td>
                <td className="border px-4 py-2">
                  <div className="text-base font-semibold">{project.project}</div>
                  <div className="text-gray-700 text-sm py-1">
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
                  <LabelWithSparkline
                    label={project.latestTestsSummary?.totalTests || 0}
                    data={project.weeklyTestsSummary.map(t => t.totalTests)}
                    lineColor={increaseIsBetter(
                      project.weeklyTestsSummary.map(t => t.totalTests)
                    )}
                  />
                </td>
                <td className="text-center border px-4 py-2">
                  <LabelWithSparkline
                    label={divide(
                      project.latestCoverageSummary?.coveredBranches || 0,
                      project.latestCoverageSummary?.totalBranches || 0
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={project.weeklyCoverageSummary.map(week => {
                      return divide(week.coveredBranches, week.totalBranches)
                        .map(multiply(100))
                        .getOr(0);
                    })}
                    lineColor={increaseIsBetter(
                      project.weeklyCoverageSummary.map(week => {
                        return divide(week.coveredBranches || 0, week.totalBranches || 0)
                          .map(multiply(100))
                          .getOr(0);
                      })
                    )}
                    // lineColor={increaseIsBetter(stats.totalCoverageByWeek)}
                    yAxisLabel={x => `${x}%`}
                  />
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
