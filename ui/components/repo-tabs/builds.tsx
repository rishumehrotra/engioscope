import React, { Fragment, useCallback, useState } from 'react';
import type { RepoAnalysis } from '../../../shared/types.js';
import { num, shortDate } from '../../helpers/utils.js';
import AlertMessage from '../common/AlertMessage.js';
import type { Tab } from './Tabs.js';
import TabContents from './TabContents.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import useQueryParam, { asString } from '../../hooks/use-query-param.js';
import BuildInsights from './BuildInsights.jsx';

export default (builds: RepoAnalysis['builds'], queryPeriodDays: number): Tab => ({
  title: 'Builds',
  count: builds?.count || 0,
  Component: () => {
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [showBuildDetails] = useQueryParam('build-details', asString);

    const toggleExpanded = useCallback((url: string) => {
      if (expandedRows.includes(url)) return setExpandedRows(e => e.filter(u => u !== url));
      setExpandedRows(e => [...e, url]);
    }, [expandedRows]);

    const isExpanded = useCallback((url: string) => (
      expandedRows.includes(url)
    ), [expandedRows]);

    return (
      <TabContents gridCols={1}>
        {builds
          ? (
            <div className="overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th> </th>
                    <th>Central template</th>
                    <th>Successful</th>
                    <th>Runs</th>
                    <th>Success rate</th>
                    <th className="text-right" style={{ paddingRight: 0 }}>Average duration</th>
                    <th className="text-left">Current status</th>
                  </tr>
                </thead>
                <tbody>
                  {builds.pipelines.map(pipeline => (
                    <Fragment key={pipeline.url}>
                      <tr className={`${pipeline.status.type === 'unused' ? 'opacity-60' : ''}`}>
                        <td>
                          <div className="flex">
                            {showBuildDetails
                              ? (
                                <button
                                  onClick={() => toggleExpanded(pipeline.url)}
                                  className="mr-2"
                                >
                                  <span
                                    className="list-item"
                                    style={{ listStyleType: isExpanded(pipeline.url) ? 'disclosure-open' : 'disclosure-closed' }}
                                  />
                                </button>
                              )
                              : null}
                            <a
                              href={pipeline.url}
                              target="_blank"
                              rel="noreferrer"
                              data-tip={pipeline.name}
                              className="link-text"
                            >
                              <span className="truncate w-96 block">
                                {pipeline.name}
                                {pipeline.type !== 'yml' ? (
                                  <span
                                    className={`inline-block ml-2 uppercase text-xs px-1 border-red-700 bg-red-100
                                rounded-sm text-red-700 border font-semibold no-underline`}
                                    data-tip="This pipeline is configured using the UI instead of a YAML file"
                                  >
                                    UI
                                  </span>
                                ) : null}
                              </span>
                            </a>
                          </div>
                        </td>
                        <td>
                          {pipeline.usesTemplate
                            ? (
                              <span className={`uppercase text-xs px-1 border bg-green-100 border-green-700
                            rounded-sm text-green-700 font-semibold`}
                              >
                                Yes
                              </span>
                            )
                            : (
                              <span className="uppercase text-xs px-1 border-red-300 bg-red-100 rounded-sm text-red-500 border">
                                No
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
                                <div className="text-gray-400 text-sm" data-tip="loading">
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
                                  {`Last used ${pipeline.status.since
                                    ? `${shortDate(new Date(pipeline.status.since))}, ${new Date(pipeline.status.since).getFullYear()}`
                                    : 'unknown'}`}
                                </span>
                              </>
                            ) : undefined}
                        </td>
                      </tr>
                      {isExpanded(pipeline.url)
                        ? (
                          <tr>
                            <td colSpan={7}>
                              <BuildInsights url={pipeline.url} />
                            </td>
                          </tr>
                        )
                        : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              <div className="w-full text-right text-sm italic text-gray-500 mt-4">
                {`* Data shown is for the last ${queryPeriodDays} days`}
              </div>
            </div>
          )
          : (
            <TabContents gridCols={1}>
              <AlertMessage message="No builds for this repo in the last three months" />
            </TabContents>
          )}
      </TabContents>
    );
  }
});
