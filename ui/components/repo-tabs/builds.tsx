import React from 'react';
import { RepoAnalysis } from '../../../shared/types';
import { num, shortDate } from '../../helpers/utils';
import AlertMessage from '../AlertMessage';
import { Tab } from './Tabs';
import TabContents from './TabContents';

export default (builds: RepoAnalysis['builds']): Tab => ({
  title: 'Builds',
  count: builds?.count || 0,
  content: (
    <TabContents gridCols={1}>
      {builds
        ? (
          <>
            <table className="table-auto text-center divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-xs w-2/6 font-medium text-gray-800 uppercase tracking-wider"> </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Successful</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Runs</th>
                  <th className="pl-6 pr-0 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Success rate</th>
                  <th className="pr-6 pl-0 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">Average duration</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-left">Current status</th>
                </tr>
              </thead>
              <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                {builds.pipelines.map(pipeline => (
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
                    <td className="px-6 py-4 whitespace-nowrap">{pipeline.success}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.count)}</td>
                    <td className="pl-6 pr-0 py-4 whitespace-nowrap">{`${Math.round((pipeline.success * 100) / pipeline.count)}%`}</td>
                    <td className="pr-6 pl-0 py-4 whitespace-nowrap text-right">
                      <span className="text-bold">{pipeline.duration.average}</span>
                      <div className="text-gray-400 text-sm">
                        (
                        {`${pipeline.duration.min} - ${pipeline.duration.max}`}
                        )
                      </div>

                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      {pipeline.status.type !== 'failed' && (
                        <>
                          <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                          <span className="capitalize">{pipeline.status.type}</span>
                        </>
                      )}
                      {pipeline.status.type === 'failed'
                        ? (
                          <>
                            <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                            <span>{`Failing since ${shortDate(new Date(pipeline.status.since))}`}</span>
                          </>
                        ) : undefined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="w-full text-right text-sm italic text-gray-500 mt-4">
              <span>* Data shown is for the last 30 days</span>
            </div>
          </>
        )
        : (
          <TabContents gridCols={1}>
            <AlertMessage message="No builds for this repo in the last month" />
          </TabContents>
        )}
    </TabContents>
  )
});
