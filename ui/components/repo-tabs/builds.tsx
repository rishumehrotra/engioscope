import React from 'react';
import type { RepoAnalysis } from '../../../shared/types';
import { num, shortDate } from '../../helpers/utils';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';
import { divide, toPercentage } from '../../../shared/utils';

export default (builds: RepoAnalysis['builds']): Tab => ({
  title: 'Builds',
  count: builds?.count || 0,
  content: () => (
    <TabContents gridCols={1}>
      {builds
        ? (
          <div className="overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th> </th>
                  <th>Type</th>
                  <th>Successful</th>
                  <th>Runs</th>
                  <th>Success rate</th>
                  <th className="text-right" style={{ paddingRight: 0 }}>Average duration</th>
                  <th className="text-left">Current status</th>
                </tr>
              </thead>
              <tbody>
                {builds.pipelines.map(pipeline => (
                  <tr key={pipeline.url} className={`${pipeline.status.type === 'unused' ? 'opacity-60' : ''}`}>
                    <td>
                      <a
                        href={pipeline.url}
                        target="_blank"
                        rel="noreferrer"
                        data-tip={pipeline.name}
                        className="link-text"
                      >
                        <span className="truncate w-96 block">
                          {pipeline.name}
                        </span>
                      </a>
                    </td>
                    <td>
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
                    <td>{pipeline.status.type === 'unused' ? '-' : pipeline.success}</td>
                    <td>{pipeline.status.type === 'unused' ? '-' : num(pipeline.count)}</td>
                    <td>
                      {pipeline.status.type === 'unused'
                        ? '-'
                        : (
                          divide(pipeline.success, pipeline.count)
                            .map(toPercentage)
                            .getOr('-')
                        )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
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
                    <td style={{ textAlign: 'left' }} className="pl-6">
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
              <span>* Data shown is for the last 90 days</span>
            </div>
          </div>
        )
        : (
          <TabContents gridCols={1}>
            <AlertMessage message="No builds for this repo in the last three months" />
          </TabContents>
        )}
    </TabContents>
  )
});
