import React from 'react';
import { last, multiply, prop } from 'rambda';
import { byNum, byString } from 'sort-lib';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import { LabelWithSparkline } from '../graphs/Sparkline.jsx';
import { increaseIsBetter } from '../summary-page/utils.jsx';
import { useTableSorter } from '../../hooks/use-table-sorter.jsx';
import Loading from '../Loading.jsx';
import { num } from '../../helpers/utils.js';
import AnalysedRepos from './AnalysedRepos.jsx';

type CollectionTestAutomatioinSummary =
  RouterClient['summary']['getCollectionTestAutomationSummary'][number];

const sorters = {
  byName: byString<CollectionTestAutomatioinSummary>(prop('project')),
  byTests: byNum<CollectionTestAutomatioinSummary>(x => {
    const lastWeek = last(x.weeklyTestsSummary);
    if (!lastWeek?.hasTests) return 0;
    return lastWeek.totalTests;
  }),
  byCoverage: byNum<CollectionTestAutomatioinSummary>(x => {
    const lastWeek = last(x.weeklyCoverageSummary);
    if (!lastWeek?.hasCoverage) return 0;
    return divide(lastWeek.coveredBranches, lastWeek.totalBranches).getOr(0);
  }),
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
                <button {...buttonProps('byName')}>
                  <span>Project</span>
                  {sortIcon('byName')}
                </button>
              </th>
              <th>
                <button {...buttonProps('byTests')}>
                  <span>Tests</span>
                  {sortIcon('byTests')}
                </button>
              </th>
              <th>
                <button {...buttonProps('byCoverage')}>
                  <span>Coverage</span>
                  {sortIcon('byCoverage')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.sort(sorter).map(project => (
              <tr key={project.project}>
                <td className="left">
                  <a href={`${collectionName}/${project.project}/repos`}>
                    <div>{project.project}</div>
                    <AnalysedRepos
                      active={project.totalActiveRepos}
                      total={project.totalRepos}
                    />
                  </a>
                </td>
                <td>
                  <LabelWithSparkline
                    label={(() => {
                      if (!project.weeklyTestsSummary) return null;
                      const lastMatch = project.weeklyTestsSummary.findLast(
                        x => x.hasTests
                      );
                      if (!lastMatch) return 0;
                      if (!lastMatch.hasTests) return 0;
                      return num(lastMatch.totalTests);
                    })()}
                    data={project.weeklyTestsSummary.map(t =>
                      t.hasTests ? t.totalTests : 0
                    )}
                    lineColor={increaseIsBetter(
                      project.weeklyTestsSummary.map(t => (t.hasTests ? t.totalTests : 0))
                    )}
                  />
                </td>
                <td>
                  <LabelWithSparkline
                    // label={divide(
                    //   last(project.weeklyCoverageSummary)?.coveredBranches || 0,
                    //   last(project.weeklyCoverageSummary)?.totalBranches || 0
                    // )
                    //   .map(toPercentage)
                    //   .getOr('-')}

                    // eslint-disable-next-line react/jsx-props-no-multi-spaces
                    label={(() => {
                      if (!project.weeklyCoverageSummary) return null;
                      const lastMatch = project.weeklyCoverageSummary.findLast(
                        x => x.hasCoverage
                      );
                      if (!lastMatch) return '-';
                      if (!lastMatch.hasCoverage) {
                        throw new Error("TS can't figure out that hasTests is true");
                      }
                      return divide(lastMatch.coveredBranches, lastMatch.totalBranches)
                        .map(toPercentage)
                        .getOr('-');
                    })()}
                    data={project.weeklyCoverageSummary.map(week => {
                      return divide(
                        week.hasCoverage ? week.coveredBranches : 0,
                        week.hasCoverage ? week.totalBranches : 0
                      )
                        .map(multiply(100))
                        .getOr(0);
                    })}
                    lineColor={increaseIsBetter(
                      project.weeklyCoverageSummary.map(week => {
                        return divide(
                          week.hasCoverage ? week.coveredBranches : 0,
                          week.hasCoverage ? week.totalBranches : 0
                        )
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
