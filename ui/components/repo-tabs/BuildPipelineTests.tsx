import prettyMs from 'pretty-ms';
import { compose, multiply, not, prop, subtract, sum } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import { asc, byNum, byString } from 'sort-lib';
import { ChevronRight } from 'react-feather';
import { twJoin } from 'tailwind-merge';
import { divide, toPercentage } from '../../../shared/utils.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import AlertMessage from '../common/AlertMessage.jsx';
import { LabelWithSparkline } from '../graphs/Sparkline.jsx';
import TabContents from './TabContents.jsx';
import { pathRendererSkippingUndefineds } from '../graphs/sparkline-renderers.jsx';
import SortableTable from '../common/SortableTable.jsx';
import { num } from '../../helpers/utils.js';
import useQueryParam, { asString } from '../../hooks/use-query-param.js';
import AnimateHeight from '../common/AnimateHeight.jsx';
import { increaseIsBetter as increaseIsBetter2 } from '../graphs/TinyAreaGraph.jsx';
import { increaseIsBetter } from '../summary-page/utils.jsx';
import InfoBox from '../InfoBox.jsx';

const EmptyTests = () => (
  <InfoBox>
    Already running tests but it isn't showing up? Do one of the following:
    <ul className="ml-6 mt-1">
      <li className="list-disc">
        Ensure that you're{' '}
        <a
          href="https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines&tabs=trx%2Ctrxattachments%2Cyaml"
          target="_blank"
          rel="noreferrer"
          className="link-text"
        >
          publishing your test and coverage details to Azure
        </a>
        .
      </li>
      <li className="list-disc">
        OR, use the central build template where this is already addressed.
      </li>
    </ul>
  </InfoBox>
);

const BuildPipelineTests: React.FC<{
  repositoryId: string;
  queryPeriodDays: number;
}> = ({ repositoryId, queryPeriodDays }) => {
  const [enableNewTabs] = useQueryParam('test-tab', asString);
  const [hiddenPipelinesState, setHiddenPipelinesState] = useState<
    'collapsed' | 'open' | 'collapsing'
  >('collapsed');
  const tests = trpc.tests.getTestsAndCoverageForRepoIds.useQuery({
    queryContext: useQueryContext(),
    repositoryIds: [repositoryId],
  });
  const pipelineHasTests = useCallback(
    (x: RouterClient['tests']['getTestsAndCoverageForRepoIds'][number]) =>
      sum(x.tests?.map(y => (y.hasTests ? y.totalTests : 0)) || []) > 0,
    []
  );

  const pipelinesWithTests = useMemo(() => {
    return tests.data?.filter(pipelineHasTests);
  }, [pipelineHasTests, tests.data]);

  const pipelinesWithoutTests = useMemo(() => {
    return tests.data?.filter(compose(not, pipelineHasTests));
  }, [pipelineHasTests, tests.data]);

  if (!tests.data) return null;

  return (
    <TabContents gridCols={1}>
      {enableNewTabs && (
        <>
          {
            <>
              <SortableTable
                data={pipelinesWithTests}
                rowKey={row => String(row.id)}
                variant="default"
                defaultSortColumnIndex={1}
                columns={[
                  {
                    title: 'Build pipeline',
                    key: 'build pipeline',
                    // eslint-disable-next-line react/no-unstable-nested-components
                    value: pipeline => (
                      <a
                        href={pipeline.url}
                        target="_blank"
                        rel="noreferrer"
                        data-tooltip-id="react-tooltip"
                        data-tooltip-content={pipeline.name}
                        className={
                          pipeline.latestTest?.hasTests
                            ? 'link-text truncate w-full'
                            : 'link-text truncate w-full opacity-60'
                        }
                      >
                        {pipeline.name}
                      </a>
                    ),
                    sorter: byString(x => x.name),
                  },
                  {
                    title: 'Total tests',
                    key: 'tests',
                    value: pipeline =>
                      pipeline.latestTest?.hasTests
                        ? num(pipeline.latestTest.totalTests)
                        : '-',
                    sorter: byNum(x =>
                      x.latestTest?.hasTests ? x.latestTest.totalTests : 0
                    ),
                  },
                  {
                    title: '',
                    key: 'tests graph',
                    value: pipeline => ({
                      type: 'graph',
                      data:
                        pipeline.tests
                          ?.sort(asc(byNum(prop('weekIndex'))))
                          .map(t => (t.hasTests ? t.totalTests : undefined)) || [],
                      color: increaseIsBetter2(
                        pipeline.tests
                          ?.sort(asc(byNum(prop('weekIndex'))))
                          .map(t => (t.hasTests ? t.totalTests : 0)) || []
                      ),
                    }),
                  },
                  {
                    title: 'Failed',
                    key: 'failed',
                    value: pipeline =>
                      pipeline.latestTest?.hasTests
                        ? num(
                            pipeline.latestTest.totalTests -
                              pipeline.latestTest.passedTests
                          )
                        : '-',
                    sorter: byNum(x =>
                      x.latestTest?.hasTests
                        ? x.latestTest.totalTests - x.latestTest.passedTests
                        : 0
                    ),
                  },
                  {
                    title: 'Execution time',
                    key: 'execution time',
                    value: pipeline =>
                      pipeline.latestTest?.hasTests
                        ? prettyMs(
                            pipeline.latestTest.completedDate.getTime() -
                              pipeline.latestTest.startedDate.getTime()
                          )
                        : '_',
                    sorter: byNum(pipeline =>
                      pipeline.latestTest?.hasTests
                        ? pipeline.latestTest.completedDate.getTime() -
                          pipeline.latestTest.startedDate.getTime()
                        : 0
                    ),
                  },
                  {
                    title: 'Branch coverage',
                    key: 'branch coverage',
                    value: pipeline =>
                      pipeline.latestCoverage?.coverage
                        ? divide(
                            pipeline.latestCoverage.coverage.coveredBranches,
                            pipeline.latestCoverage.coverage.totalBranches
                          )
                            .map(toPercentage)
                            .getOr('-')
                        : '-',
                    sorter: byNum(pipeline =>
                      pipeline.latestCoverage?.coverage
                        ? divide(
                            pipeline.latestCoverage.coverage.coveredBranches,
                            pipeline.latestCoverage.coverage.totalBranches
                          ).getOr(0)
                        : 0
                    ),
                  },
                ]}
              />
              {pipelinesWithTests?.length === 0 ? <EmptyTests /> : null}
            </>
          }
          {pipelinesWithoutTests?.length ? (
            <div className="mt-2">
              <button
                onClick={() =>
                  setHiddenPipelinesState(x => (x === 'open' ? 'collapsing' : 'open'))
                }
                className="grid grid-cols-[min-content_1fr] items-center cursor-pointer mb-2"
              >
                <div
                  className={twJoin(
                    'text-theme-icon mx-2',
                    'transition-all',
                    hiddenPipelinesState === 'open' && 'rotate-90 text-theme-icon-active'
                  )}
                >
                  <ChevronRight size={18} />
                </div>
                <div>
                  Pipelines not running tests
                  <span className="bg-theme-tag inline-block ml-2 px-2 py-0 rounded">
                    {pipelinesWithoutTests.length}
                  </span>
                </div>
              </button>
              {hiddenPipelinesState !== 'collapsed' && (
                <AnimateHeight
                  collapse={hiddenPipelinesState === 'collapsing'}
                  onCollapsed={() => setHiddenPipelinesState('collapsed')}
                >
                  {(pipelinesWithTests?.length || 0) > 0 && <EmptyTests />}
                  <ul
                    className={twJoin(
                      'ml-8',
                      (pipelinesWithTests?.length || 0) > 0 && 'mt-2'
                    )}
                  >
                    {pipelinesWithoutTests.map(pipeline => (
                      <li key={pipeline.id} className="inline-block p-1">
                        <a
                          href={pipeline.url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-theme-tag px-2 py-0.5 inline-block rounded hover:text-theme-highlight"
                        >
                          {pipeline.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </AnimateHeight>
              )}
            </div>
          ) : null}
        </>
      )}
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
                            data-tooltip-id="react-tooltip"
                            data-tooltip-content={pipeline.name}
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
                        data-tooltip-id="react-tooltip"
                        data-tooltip-content={pipeline.name}
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
