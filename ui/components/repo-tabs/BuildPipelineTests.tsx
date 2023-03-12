import prettyMs from 'pretty-ms';
import React from 'react';
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
  const tests = trpc.tests.getTestRunsForRepository.useQuery({
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
                <th> </th>
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
                  <td>
                    {pipeline.tests ? (
                      <LabelWithSparkline
                        label={
                          <a
                            href={pipeline.url}
                            target="_blank"
                            rel="noreferrer"
                            data-tip={pipeline.name}
                            className="link-text truncate w-full"
                          >
                            {pipeline.name}
                          </a>
                        }
                        data={pipeline.tests.map(t => t.totalTests)}
                        lineColor={increaseIsBetter(
                          pipeline.tests.map(t => t.totalTests || 0)
                        )}
                      />
                    ) : (
                      <a
                        href={pipeline.url}
                        target="_blank"
                        rel="noreferrer"
                        data-tip={pipeline.name}
                        className="link-text truncate w-full"
                      >
                        {pipeline.name}
                      </a>
                    )}
                  </td>
                  <td>
                    {pipeline.tests?.length ? pipeline.tests[0].passedTests || 0 : '_'}
                  </td>
                  <td>
                    {pipeline.tests?.length &&
                    pipeline.tests[0].totalTests &&
                    pipeline.tests[0]?.passedTests
                      ? pipeline.tests[0].totalTests - pipeline.tests[0].passedTests
                      : '_'}
                  </td>
                  <td>
                    {pipeline.tests?.length &&
                    pipeline.tests[0].startedDate !== null &&
                    pipeline.tests[0].completedDate !== null &&
                    pipeline.tests[0].startedDate &&
                    pipeline.tests[0].completedDate
                      ? prettyMs(
                          pipeline.tests[0].completedDate.getTime() -
                            pipeline.tests[0].startedDate.getTime()
                        )
                      : '_'}
                  </td>
                  <td>
                    Line Chart
                    {/* {pipeline.coverage
                      ? 'Line Chart'
                      : // <LabelWithSparkline
                        //   label={
                        //     pipeline.coverage
                        //       ? divide(pipeline.coverage.covered, pipeline.coverage.total)
                        //           .map(toPercentage)
                        //           .getOr('-')
                        //       : '-'
                        //   }
                        //   data={(pipeline.coverageByWeek || []).map(c =>
                        //     c ? divide(c.covered, c.total).map(multiply(100)).getOr(0) : 0
                        //   )}
                        //   lineColor={increaseIsBetter(
                        //     (pipeline.coverageByWeek || []).map(c =>
                        //       c ? divide(c.covered, c.total).getOr(0) : 0
                        //     )
                        //   )}
                        //   yAxisLabel={x => `${x}%`}
                        // />
                        '-'} */}
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
