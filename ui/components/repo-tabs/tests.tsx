import React from 'react';
import { multiply } from 'rambda';
import type { RepoAnalysis } from '../../../shared/types.js';
import { num } from '../../helpers/utils.js';
import AlertMessage from '../common/AlertMessage.js';
import type { Tab } from './Tabs.js';
import TabContents from './TabContents.js';
import { LabelWithSparkline } from '../graphs/Sparkline.js';
import { increaseIsBetter } from '../summary-page/utils.js';
import { numberOfTests } from '../../../shared/repo-utils.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import BuildPipelineTests from './BuildPipelineTests.jsx';
import useQueryParam, { asBoolean } from '../../hooks/use-query-param.js';

export default (repo: RepoAnalysis, queryPeriodDays: number): Tab => ({
  title: 'Tests',
  count: numberOfTests(repo),
  Component: () => {
    const [showNewBuild] = useQueryParam('build-v2', asBoolean);
    return (
      <>
        {showNewBuild ? (
          <BuildPipelineTests repositoryId={repo.id} queryPeriodDays={queryPeriodDays} />
        ) : null}
        <TabContents gridCols={1}>
          {repo.tests?.length ? (
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
                  {repo.tests.map(pipeline => (
                    <tr key={pipeline.id}>
                      <td>
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
                          data={pipeline.testsByWeek}
                          lineColor={increaseIsBetter(pipeline.testsByWeek)}
                        />
                      </td>
                      <td>{num(pipeline.successful)}</td>
                      <td>{num(pipeline.failed)}</td>
                      <td>{pipeline.executionTime}</td>
                      <td>
                        {pipeline.coverage ? (
                          <LabelWithSparkline
                            label={
                              pipeline.coverage
                                ? divide(
                                    pipeline.coverage.covered,
                                    pipeline.coverage.total
                                  )
                                    .map(toPercentage)
                                    .getOr('-')
                                : '-'
                            }
                            data={(pipeline.coverageByWeek || []).map(c =>
                              c
                                ? divide(c.covered, c.total).map(multiply(100)).getOr(0)
                                : 0
                            )}
                            lineColor={increaseIsBetter(
                              (pipeline.coverageByWeek || []).map(c =>
                                c ? divide(c.covered, c.total).getOr(0) : 0
                              )
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
      </>
    );
  },
});
