import prettyMs from 'pretty-ms';
import { multiply, prop, subtract } from 'rambda';
import React from 'react';
import { asc, byNum } from 'sort-lib';
import { divide, toPercentage } from '../../../shared/utils.js';
import { trpc } from '../../helpers/trpc.js';
import { useDateRange } from '../../hooks/date-range-hooks.jsx';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import AlertMessage from '../common/AlertMessage.jsx';
import { LabelWithSparkline } from '../graphs/Sparkline.jsx';
import { increaseIsBetter } from '../summary-page/utils.jsx';
import TabContents from './TabContents.jsx';
import { pathRendererSkippingUndefineds } from '../graphs/sparkline-renderers.jsx';

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
                {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                <th />
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
                        data={pipeline.tests
                          .sort(asc(byNum(prop('weekIndex'))))
                          .map(t => (t.hasTests ? t.totalTests : undefined))}
                        lineColor={increaseIsBetter(
                          pipeline.tests.map(t => (t.hasTests ? t.totalTests : 0))
                        )}
                        renderer={pathRendererSkippingUndefineds}
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
                  <td className={pipeline.latestTest?.hasTests ? '' : 'opacity-60'}>
                    {pipeline.latestTest?.hasTests
                      ? pipeline.latestTest.passedTests
                      : '_'}
                  </td>
                  {/* Failed Tests */}
                  <td className={pipeline.latestTest?.hasTests ? '' : 'opacity-60'}>
                    {pipeline.latestTest?.hasTests
                      ? subtract(
                          pipeline.latestTest.totalTests,
                          pipeline.latestTest.passedTests
                        )
                      : '_'}
                  </td>
                  {/* Execution Time */}
                  <td className={pipeline.latestTest?.hasTests ? '' : 'opacity-60'}>
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
                          <span
                            className={pipeline.latestTest?.hasTests ? '' : 'opacity-60'}
                          >
                            {pipeline.latestCoverage?.coverage
                              ? divide(
                                  pipeline.latestCoverage.coverage.coveredBranches,
                                  pipeline.latestCoverage.coverage.totalBranches
                                )
                                  .map(toPercentage)
                                  .getOr('-')
                              : '-'}
                          </span>
                        }
                        data={(pipeline.coverageByWeek || [])
                          .sort(asc(byNum(prop('weekIndex'))))
                          .map(c =>
                            c.coverage
                              ? divide(
                                  c.coverage.coveredBranches,
                                  c.coverage.totalBranches
                                )
                                  .map(multiply(100))
                                  // eslint-disable-next-line unicorn/no-useless-undefined
                                  .getOr(undefined)
                              : undefined
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
                        renderer={pathRendererSkippingUndefineds}
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
