import React from 'react';
import type { RepoAnalysis } from '../../../shared/types';
import { num, exaggerateTrendLine } from '../../helpers/utils';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';
import Sparkline from '../graphs/Sparkline';
import { increaseIsBetter } from '../summary-page/utils';

export default (tests: RepoAnalysis['tests']): Tab => ({
  title: 'Tests',
  count: tests?.total || 0,
  content: () => (
    <TabContents gridCols={1}>
      {tests?.pipelines.length ? (
        <>
          <table className="table-auto text-center divide-y divide-gray-200 w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 w-2/6 text-xs font-medium text-gray-800 uppercase tracking-wider"> </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                  Successful
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                  Failed
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Execution time</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Branch coverage</th>
              </tr>
            </thead>
            <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
              {tests.pipelines.map(pipeline => (
                <tr key={pipeline.name}>
                  <td className="pl-6 py-4 whitespace-nowrap text-left">
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
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.successful)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.failed)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.executionTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pipeline.coverage ? `${Math.round((pipeline.coverage.covered * 100) / pipeline.coverage.total)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="w-full text-right text-sm italic text-gray-500 mt-4">
            <span>* Data shown is for the most recent test run, if it occurred in the last 30 days</span>
          </div>
        </>
      ) : (
        <TabContents gridCols={1}>
          <AlertMessage message="This repo didn't have any tests running in pipelines in the last month" />
        </TabContents>
      )}
    </TabContents>
  )
});
