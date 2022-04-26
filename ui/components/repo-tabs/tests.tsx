import React from 'react';
import type { RepoAnalysis } from '../../../shared/types';
import { num, exaggerateTrendLine } from '../../helpers/utils';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';
import Sparkline from '../graphs/Sparkline';
import { increaseIsBetter } from '../summary-page/utils';
import { numberOfTests } from '../../../shared/repo-utils';
import { divide, toPercentage } from '../../../shared/utils';

export default (repo: RepoAnalysis): Tab => ({
  title: 'Tests',
  count: numberOfTests(repo),
  content: () => (
    <TabContents gridCols={1}>
      {repo.tests?.length ? (
        <>
          <table className="table">
            <thead>
              <tr>
                <th> </th>
                <th>
                  <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                  Successful
                </th>
                <th>
                  <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
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
                    <a
                      href={pipeline.url}
                      target="_blank"
                      rel="noreferrer"
                      data-tip={pipeline.name}
                      className="link-text"
                    >
                      <span className="truncate w-full block">
                        {pipeline.name}
                        <Sparkline
                          data={exaggerateTrendLine(pipeline.testsByWeek)}
                          className="inline-block ml-2 -mb-1"
                          lineColor={increaseIsBetter(pipeline.testsByWeek)}
                        />
                      </span>
                    </a>
                  </td>
                  <td>{num(pipeline.successful)}</td>
                  <td>{num(pipeline.failed)}</td>
                  <td>{pipeline.executionTime}</td>
                  <td>
                    {pipeline.coverage
                      ? divide(pipeline.coverage.covered, pipeline.coverage.total)
                        .map(toPercentage)
                        .getOr('-')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="w-full text-right text-sm italic text-gray-500 mt-4">
            <span>* Data shown is for the most recent test run, if it occurred in the last 90 days</span>
          </div>
        </>
      ) : (
        <TabContents gridCols={1}>
          <AlertMessage message="This repo didn't have any tests running in pipelines in the last three months" />
        </TabContents>
      )}
    </TabContents>
  )
});
