import prettyMs from 'pretty-ms';
import { multiply, subtract } from 'rambda';
import React from 'react';
import { divide, toPercentage } from '../../../shared/utils.js';
import { trpc } from '../../helpers/trpc.js';
import { useDateRange } from '../../hooks/date-range-hooks.jsx';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import AlertMessage from '../common/AlertMessage.jsx';
import { LabelWithSparkline } from '../graphs/Sparkline.jsx';
import { increaseIsBetter } from '../summary-page/utils.jsx';
import TabContents from './TabContents.jsx';

const BuildPipelineTests: React.FC<{
  repositoryId: string;
  queryPeriodDays: number;
}> = ({ repositoryId, queryPeriodDays }) => {
  const { collectionName, project } = useCollectionAndProject();

  const dateRange = useDateRange();
  const tests = trpc.tests.getTestRunsAndCoverageForRepo.useQuery({
    collectionName,
    project,
    repositoryId,
    ...dateRange,
  });

  if (!tests.data) return null;

  return (
    <TabContents gridCols={1}>
      {tests.data.length ? (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>
                  <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2">
                    {' '}
                  </span>
                  Successful
                </th>
                <th>
                  <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2">
                    {' '}
                  </span>
                  Failed
                </th>
                <th>Execution time</th>
                <th>Branch coverage</th>
              </tr>
            </thead>
            <tbody>
              {tests.data.map(pipeline => (
                <tr key={pipeline.id}>
                  {/* Pipeline Name */}
                  <td>
                    {pipeline.tests?.length ? (
                      <LabelWithSparkline
                        label={
                          <a
                            href={pipeline.url}
                            target="_blank"
                            rel="noreferrer"
                            data-tip={pipeline.name}
                            className={
                              pipeline.latestTest?.hasTests
                                ? 'link-text truncate w-full'
                                : 'link-text truncate w-full opacity-60'
                            }
                          >
                            {pipeline.name}
                          </a>
                        }
                        data={pipeline.tests.map(t => (t.hasTests ? t.totalTests : 0))}
                        lineColor={increaseIsBetter(
                          pipeline.tests.map(t => (t.hasTests ? t.totalTests : 0))
                        )}
                      />
                    ) : (
                      <a
                        href={pipeline.url}
                        target="_blank"
                        rel="noreferrer"
                        data-tip={pipeline.name}
                        className="link-text truncate w-full opacity-60"
                      >
                        {pipeline.name}
                      </a>
                    )}
                  </td>
                  {/* Passed Tests */}
                  <td>
                    {pipeline.latestTest?.hasTests
                      ? pipeline.latestTest.passedTests
                      : '_'}
                  </td>
                  {/* Failed Tests */}
                  <td>
                    {pipeline.latestTest?.hasTests
                      ? subtract(
                          pipeline.latestTest.totalTests,
                          pipeline.latestTest.passedTests
                        )
                      : '_'}
                  </td>
                  {/* Execution Time */}
                  <td>
                    {pipeline.latestTest?.hasTests
                      ? prettyMs(
                          pipeline.latestTest.completedDate.getTime() -
                            pipeline.latestTest.startedDate.getTime()
                        )
                      : '_'}
                  </td>
                  {/* Branch Coverage */}
                  <td>
                    {pipeline.coverageByWeek ? (
                      <LabelWithSparkline
                        label={
                          pipeline.latestCoverage?.coverage
                            ? divide(
                                pipeline.latestCoverage.coverage.coveredBranches,
                                pipeline.latestCoverage.coverage.totalBranches
                              )
                                .map(toPercentage)
                                .getOr('-')
                            : '-'
                        }
                        data={(pipeline.coverageByWeek || []).map(c =>
                          c.coverage
                            ? divide(c.coverage.coveredBranches, c.coverage.totalBranches)
                                .map(multiply(100))
                                .getOr(0)
                            : 0
                        )}
                        lineColor={increaseIsBetter(
                          (pipeline.coverageByWeek || []).map(c => {
                            return c.coverage
                              ? divide(
                                  c.coverage.coveredBranches,
                                  c.coverage.totalBranches
                                ).getOr(0)
                              : 0;
                          })
                        )}
                        yAxisLabel={x => `${x}%`}
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="w-full text-right text-sm italic text-gray-500 mt-4">
            {`* Data shown is for the most recent test run, if it occurred in the last ${queryPeriodDays} days on the `}
            <code>master</code>
            {' branch'}
          </div>
        </>
      ) : (
        <TabContents gridCols={1}>
          <AlertMessage message="This repo didn't have any tests running in pipelines in the last three months" />
        </TabContents>
      )}
    </TabContents>
  );
};

export default BuildPipelineTests;
