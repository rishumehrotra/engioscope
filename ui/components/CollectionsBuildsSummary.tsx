import React from 'react';
import { multiply } from 'rambda';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { LabelWithSparkline } from './graphs/Sparkline.jsx';
import { increaseIsBetter } from './summary-page/utils.jsx';

const CollectionsBuildsSummary: React.FC<{
  collectionName: string;
  opened: boolean;
}> = ({ collectionName, opened }) => {
  const collectionSummary = trpc.summary.getCollectionBuildsSummary.useQuery(
    {
      collectionName,
    },
    {
      enabled: opened,
    }
  );

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
              <th className="text-sm font-semibold px-4 py-4">Total Builds</th>
              <th className="text-sm font-semibold px-4 py-4">Successful Builds</th>
              <th className="text-sm font-semibold px-4 py-4">YAML Pipelines</th>
              <th className="text-sm font-semibold px-4 py-4">Central Template Usage</th>
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
                  {/* {project.totalBuilds.count ?? '-'} */}
                  <LabelWithSparkline
                    label={project.totalBuilds.count}
                    data={project.totalBuilds.byWeek.map(week => week.count)}
                    lineColor={increaseIsBetter(
                      project.totalBuilds.byWeek.map(week => week.count)
                    )}
                  />
                </td>
                <td className="text-center border px-4 py-2">
                  <LabelWithSparkline
                    label={divide(
                      project.successfulBuilds.count,
                      project.totalBuilds.count
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={project.totalBuilds.byWeek.map(build => {
                      const successfulBuildsForWeek =
                        project.successfulBuilds.byWeek.find(
                          s => s.weekIndex === build.weekIndex
                        );
                      return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                        .map(multiply(100))
                        .getOr(0);
                    })}
                    lineColor={increaseIsBetter(
                      project.totalBuilds.byWeek.map(build => {
                        const successfulBuildsForWeek =
                          project.successfulBuilds.byWeek.find(
                            s => s.weekIndex === build.weekIndex
                          );
                        return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                          .map(multiply(100))
                          .getOr(0);
                      })
                    )}
                    yAxisLabel={x => `${x}%`}
                  />
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

export default CollectionsBuildsSummary;
