import React from 'react';
import { multiply, prop } from 'rambda';
import { byNum, byString } from 'sort-lib';
import type { RouterClient } from '../helpers/trpc.js';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { LabelWithSparkline } from './graphs/Sparkline.jsx';
import { increaseIsBetter } from './summary-page/utils.jsx';
import { useTableSorter } from '../hooks/useTableSorter.jsx';
import Loading from './Loading.jsx';
import { num } from '../helpers/utils.js';

type CollectionTestAutomationSummary =
  RouterClient['summary']['getCollectionTestAutomationSummary'][number];

const sorters = {
  byName: byString<CollectionTestAutomationSummary>(prop('project')),
  byTests: byNum<CollectionTestAutomationSummary>(
    x => x.latestTestsSummary?.totalTests || 0
  ),
  byCoverage: byNum<CollectionTestAutomationSummary>(x =>
    divide(
      x.latestCoverageSummary?.coveredBranches || 0,
      x.latestCoverageSummary?.totalBranches || 0
    ).getOr(0)
  ),
};

const CollectionsTestAutomationSummary: React.FC<{
  collectionName: string;
  opened: boolean;
}> = ({ collectionName, opened }) => {
  const collectionSummary = trpc.summary.getCollectionTestAutomationSummary.useQuery(
    { collectionName },
    { enabled: opened }
  );

  const { buttonProps, sortIcon, sorter } = useTableSorter(sorters, 'byName');

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
              <th className="left">
                <button {...buttonProps('byName')}>{sortIcon('byName')} Project</button>
              </th>
              <th>
                <button {...buttonProps('byTests')}>{sortIcon('byTests')} Tests</button>
              </th>
              <th>
                <button {...buttonProps('byCoverage')}>
                  {sortIcon('byCoverage')} Coverage
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.sort(sorter).map(project => (
              <tr key={project.project}>
                <td className="left">
                  <a href={`${collectionName}/${project.project}/repos`}>
                    <div className="text-base font-semibold">{project.project}</div>
                    <div className="text-gray-600 text-xs py-1">
                      Analyzed
                      <span className="font-semibold">
                        {` ${project.totalActiveRepos} `}
                      </span>
                      active repositories, excluded{' '}
                      <span className="font-semibold">
                        {` ${project.totalRepos - project.totalActiveRepos || 0} `}
                      </span>
                      inactive repositories
                    </div>
                  </a>
                </td>
                <td>
                  <LabelWithSparkline
                    label={num(project.latestTestsSummary?.totalTests || 0)}
                    data={project.weeklyTestsSummary.map(t => t.totalTests)}
                    lineColor={increaseIsBetter(
                      project.weeklyTestsSummary.map(t => t.totalTests)
                    )}
                  />
                </td>
                <td>
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
