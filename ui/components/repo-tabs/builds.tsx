import React from 'react';
import type { RepoAnalysis } from '../../../shared/types';
import { num, shortDate } from '../../helpers/utils';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';

export default (builds: RepoAnalysis['builds']): Tab => ({
  title: 'Builds',
  count: builds?.count || 0,
  content: () => (
    <TabContents gridCols={1}>
      {builds
        ? (
          <>
            <table className="table-auto text-center divide-y divide-gray-200 w-full">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-xs w-2/6 font-medium text-gray-800 uppercase tracking-wider"> </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Successful</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Runs</th>
                  <th className="pl-6 pr-0 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Success rate</th>
                  <th className="pr-6 pl-0 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">Average duration</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-left">Current status</th>
                </tr>
              </thead>
              <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                {builds.pipelines.map(pipeline => (
                  <tr key={pipeline.name} className={`${pipeline.status.type === 'unused' ? 'opacity-60' : ''}`}>
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
                        </span>
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pipeline.type === 'yml'
                        ? (
                          <span className="uppercase text-xs px-1 border border-green-300 rounded-sm text-green-500">
                            YAML
                          </span>
                        )
                        : (
                          <span className="uppercase text-xs px-1 border border-red-300 rounded-sm text-red-500">
                            UI
                          </span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{pipeline.status.type === 'unused' ? '-' : pipeline.success}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{pipeline.status.type === 'unused' ? '-' : num(pipeline.count)}</td>
                    <td className="pl-6 pr-0 py-4 whitespace-nowrap">
                      {pipeline.status.type === 'unused' ? '-' : `${Math.round((pipeline.success * 100) / pipeline.count)}%`}
                    </td>
                    <td className="pr-6 pl-0 py-4 whitespace-nowrap text-right">
                      {pipeline.status.type === 'unused'
                        ? '-'
                        : (
                          <>
                            <span>{pipeline.duration.average}</span>
                            <div className="text-gray-400 text-sm">
                              (
                              {`${pipeline.duration.min} - ${pipeline.duration.max}`}
                              )
                            </div>
                          </>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      {pipeline.status.type !== 'failed' && pipeline.status.type !== 'unused' && (
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
                      {pipeline.status.type === 'unused'
                        ? (
                          <>
                            <span className="bg-gray-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                            <span>
                              {`Last used ${
                                pipeline.status.since
                                  ? `${shortDate(new Date(pipeline.status.since))}, ${new Date(pipeline.status.since).getFullYear()}`
                                  : 'unknown'
                              }`}
                            </span>
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
