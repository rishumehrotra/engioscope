import prettyMs from 'pretty-ms';
import { compose, not, prop, sum } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import { asc, byNum, byString } from 'sort-lib';
import { ChevronRight } from 'react-feather';
import { twJoin } from 'tailwind-merge';
import { divide, toPercentage } from '../../../shared/utils.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import SortableTable from '../common/SortableTable.jsx';
import { num } from '../../helpers/utils.js';
import AnimateHeight from '../common/AnimateHeight.jsx';
import { increaseIsBetter as increaseIsBetter2 } from '../graphs/TinyAreaGraph.jsx';
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
}> = ({ repositoryId }) => {
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
    <div>
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
              pipeline.latestTest?.hasTests ? num(pipeline.latestTest.totalTests) : '-',
            sorter: byNum(x => (x.latestTest?.hasTests ? x.latestTest.totalTests : 0)),
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
                ? num(pipeline.latestTest.totalTests - pipeline.latestTest.passedTests)
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
      {pipelinesWithTests?.length === 0 ? (
        <div className="bg-theme-page-content p-4 border-b border-theme-seperator">
          <EmptyTests />
        </div>
      ) : null}
      {pipelinesWithoutTests?.length ? (
        <div>
          <div
            className={twJoin(
              'transition-colors',
              hiddenPipelinesState === 'collapsed'
                ? 'bg-theme-page-content'
                : 'bg-theme-hover'
            )}
          >
            <button
              onClick={() =>
                setHiddenPipelinesState(x => (x === 'open' ? 'collapsing' : 'open'))
              }
              className="grid grid-cols-[min-content_1fr] items-center cursor-pointer py-2"
            >
              <div
                className={twJoin(
                  'text-theme-icon mx-2 transition-all',
                  hiddenPipelinesState === 'open' && 'rotate-90'
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
          </div>
          {hiddenPipelinesState !== 'collapsed' && (
            <AnimateHeight
              collapse={hiddenPipelinesState === 'collapsing'}
              onCollapsed={() => setHiddenPipelinesState('collapsed')}
            >
              <div className="bg-theme-page-content">
                {(pipelinesWithTests?.length || 0) > 0 && (
                  <div className="pt-4 pl-8 pr-4">
                    <EmptyTests />
                  </div>
                )}
                <ul className="ml-8 pb-2 bg-theme-page-content pt-2">
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
              </div>
            </AnimateHeight>
          )}
          <p className="py-2 px-4 text-xs italic text-theme-icon border-t border-theme-seperator">
            * Data shown is for the most recent test run, if it occurred in the last 90
            days on the master branch
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default BuildPipelineTests;
