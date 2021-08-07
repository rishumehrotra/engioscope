import React from 'react';
import { RepoAnalysis } from '../../../shared/types';
import { num } from '../../helpers/utils';
import AlertMessage from '../AlertMessage';
import { Tab } from './Tabs';
import TabContents from './TabContents';

export default (tests: RepoAnalysis['tests']): Tab => ({
  title: 'Tests',
  count: tests?.total || 0,
  content: (
    <TabContents gridCols={1}>
      {tests ? (
        <>
          <table className="table-auto text-center divide-y divide-gray-200">
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
                      title={pipeline.name}
                      className="text-blue-600 hover:underline"
                    >
                      <span className="truncate w-full block">
                        {pipeline.name}
                      </span>
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.successful)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.failed)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.executionTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.coverage}</td>
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
