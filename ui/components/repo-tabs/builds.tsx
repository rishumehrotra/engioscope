import React, { Fragment, useCallback, useState } from 'react';
import ReactTooltip from 'react-tooltip';
import prettyMilliseconds from 'pretty-ms';
import type { RepoAnalysis } from '../../../shared/types.js';
import { num, shortDate } from '../../helpers/utils.js';
import AlertMessage from '../common/AlertMessage.js';
import type { Tab } from './Tabs.js';
import TabContents from './TabContents.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import BuildInsights from './BuildInsights.jsx';
import { useProjectDetails } from '../../hooks/project-details-hooks.jsx';
import { trpc } from '../../helpers/trpc.js';
import Loading from '../Loading.jsx';
import { useQueryContext } from '../../hooks/query-hooks.js';
import useQueryPeriodDays from '../../hooks/use-query-period-days.js';
import { PullRequest } from '../common/Icons.jsx';

type CentralTemplateUsageProps = {
  centralTemplateRuns: number;
  totalRuns: number;
  buildDefinitionId: string;
};

const CentralTemplateUsage: React.FC<CentralTemplateUsageProps> = ({
  centralTemplateRuns,
  totalRuns,
  buildDefinitionId,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const projectDetails = useProjectDetails()!;
  const domId = `bdi-${buildDefinitionId}`;
  const [hasHovered, setHasHovered] = useState(false);
  const centralTemplateOptions = trpc.builds.centralTemplateOptions.useQuery(
    {
      collectionName: projectDetails.name[0],
      project: projectDetails.name[1],
      buildDefinitionId,
    },
    { enabled: hasHovered }
  );

  if (centralTemplateRuns === 0) {
    return (
      <span
        className="uppercase text-xs px-1 border-red-300 bg-red-100 rounded-sm text-red-500 border"
        data-tip="None of the builds used the central build template"
        data-place="bottom"
      >
        No
      </span>
    );
  }
  return (
    <>
      <span
        className={`uppercase text-xs px-1 border rounded-sm font-semibold ${
          centralTemplateRuns >= totalRuns
            ? 'text-green-700 bg-green-100 border-green-700'
            : 'text-amber-600 bg-amber-50 border-amber-600'
        }`}
        onMouseOver={() => setHasHovered(true)}
        onFocus={() => setHasHovered(true)}
        data-tip
        data-for={domId}
      >
        Yes
      </span>
      <ReactTooltip id={domId} place="bottom">
        <div className="w-72 pt-2 text-left whitespace-normal">
          <div className="mb-2 leading-snug">
            {centralTemplateRuns >= totalRuns ? (
              <strong>All</strong>
            ) : (
              <>
                <strong>{num(Math.min(centralTemplateRuns, totalRuns))}</strong>
                {' out of the '}
                <strong>{num(totalRuns)}</strong>
              </>
            )}
            {` build ${
              totalRuns === 1 ? 'run' : 'runs'
            } used the central build template.`}
          </div>
          {centralTemplateOptions.data ? (
            <>
              <strong>Template options:</strong>
              <ul>
                {Object.entries(centralTemplateOptions.data).map(([key, value]) => (
                  <li key={key} className="leading-normal">
                    {`${key}: `}
                    {typeof value === 'boolean' ? (
                      <span className={value ? 'text-green-500' : 'text-red-500'}>
                        {value ? '✔' : '✖'}
                      </span>
                    ) : (
                      <strong>{value}</strong>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </ReactTooltip>
    </>
  );
};

const Builds: React.FC<{
  repositoryId: string;
  repositoryName: string;
}> = ({ repositoryId, repositoryName }) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [queryPeriodDays] = useQueryPeriodDays();

  const builds = trpc.builds.getBuildsOverviewForRepository.useQuery({
    queryContext: useQueryContext(),
    repositoryId,
    repositoryName,
  });

  const toggleExpanded = useCallback(
    (url: string) => {
      if (expandedRows.includes(url)) {
        return setExpandedRows(e => e.filter(u => u !== url));
      }
      setExpandedRows(e => [...e, url]);
    },
    [expandedRows]
  );

  const isExpanded = useCallback(
    (url: string) => expandedRows.includes(url),
    [expandedRows]
  );

  return (
    <TabContents gridCols={1}>
      {builds.data ? (
        builds.data.length ? (
          <div className="overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th> </th>
                  <th>Central template</th>
                  <th>Runs</th>
                  <th>Success rate</th>
                  <th className="text-center" style={{ paddingRight: 0 }}>
                    Average duration
                  </th>
                  <th className="text-left">Current status</th>
                </tr>
              </thead>
              <tbody>
                {builds.data.map(pipeline => (
                  <Fragment key={pipeline.url}>
                    <tr className={`${pipeline.type === 'old' ? 'opacity-60' : ''}`}>
                      {/* Build Toggler */}
                      <td>
                        <div className="flex">
                          <button
                            title="Expand/collapse"
                            type="button"
                            onClick={() => toggleExpanded(pipeline.url)}
                            className="mr-2"
                          >
                            <span
                              className="list-item"
                              style={{
                                listStyleType: isExpanded(pipeline.url)
                                  ? 'disclosure-open'
                                  : 'disclosure-closed',
                              }}
                            />
                          </button>
                          <a
                            href={pipeline.url}
                            target="_blank"
                            rel="noreferrer"
                            data-tip={pipeline.definitionName}
                            className="link-text"
                          >
                            <span className="truncate w-96 block">
                              {pipeline.definitionName}
                              {pipeline.ui ? (
                                <span
                                  className={`inline-block ml-2 uppercase text-xs px-1 border-red-700 bg-red-100
                                  rounded-sm text-red-700 border font-semibold no-underline`}
                                  data-tip="This pipeline is configured using the UI instead of a YAML file"
                                >
                                  UI
                                </span>
                              ) : null}
                              {pipeline.type === 'recent' ? (
                                <span
                                  data-tip={`${num(
                                    pipeline.prCount
                                  )} builds triggered by pull requests`}
                                >
                                  <PullRequest className="inline-block w-4 ml-2" />
                                </span>
                              ) : null}
                            </span>
                          </a>
                        </div>
                      </td>
                      {/* Central Template Usage */}
                      <td>
                        <CentralTemplateUsage
                          buildDefinitionId={String(pipeline.buildDefinitionId)}
                          centralTemplateRuns={pipeline.centralTemplateCount}
                          totalRuns={pipeline.totalBuilds}
                        />
                      </td>
                      {/* Total Count */}
                      <td>
                        {pipeline.type === 'old' ? '-' : num(pipeline?.totalBuilds)}
                      </td>
                      {/* Success Rate */}
                      <td
                        {...(pipeline.type === 'old'
                          ? {}
                          : {
                              'data-tip': `${num(
                                pipeline.totalSuccessfulBuilds
                              )} successful builds`,
                              'data-html': true,
                            })}
                      >
                        {pipeline.type === 'old'
                          ? '-'
                          : divide(pipeline.totalSuccessfulBuilds, pipeline.totalBuilds)
                              .map(toPercentage)
                              .getOr('-')}
                      </td>
                      {/* Average Duration */}
                      <td
                        className="pr-4"
                        style={{
                          textAlign: 'right',
                        }}
                      >
                        {pipeline.type === 'old' || pipeline.averageDuration === 0 ? (
                          '-'
                        ) : (
                          <>
                            <span>{prettyMilliseconds(pipeline.averageDuration)}</span>
                            <div className="text-gray-400 text-sm">
                              (
                              {`${prettyMilliseconds(
                                pipeline.minDuration
                              )} - ${prettyMilliseconds(pipeline.maxDuration)}`}
                              )
                            </div>
                          </>
                        )}
                      </td>
                      {/* Current Status */}
                      <td style={{ textAlign: 'left' }} className="pl-6">
                        {pipeline.type === 'recent' &&
                          pipeline.lastBuildStatus === 'succeeded' && (
                            <>
                              <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2">
                                {' '}
                              </span>
                              <span className="capitalize">
                                {pipeline.lastBuildStatus}
                              </span>
                            </>
                          )}
                        {pipeline.type === 'recent' &&
                        (pipeline.lastBuildStatus === 'failed' ||
                          pipeline.lastBuildStatus === 'canceled' ||
                          pipeline.lastBuildStatus === 'partiallySucceeded') ? (
                          <>
                            <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2">
                              {' '}
                            </span>
                            <span>
                              {`Failing since ${shortDate(
                                new Date(pipeline.failingSince.timestamp)
                              )}`}
                            </span>
                          </>
                        ) : undefined}
                        {pipeline.type === 'old' ? (
                          <>
                            <span className="bg-gray-500 w-2 h-2 rounded-full inline-block mr-2">
                              {' '}
                            </span>
                            <span>
                              {`Last used ${
                                pipeline.latestBuildTime
                                  ? `${shortDate(
                                      new Date(pipeline.latestBuildTime)
                                    )}, ${new Date(
                                      pipeline.latestBuildTime
                                    ).getFullYear()}`
                                  : 'unknown'
                              }`}
                            </span>
                          </>
                        ) : undefined}
                      </td>
                    </tr>
                    {isExpanded(pipeline.url) ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <BuildInsights
                            buildDefinitionId={Number(pipeline.url.split('=')[1])}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div className="w-full text-right text-sm italic text-gray-500 mt-4">
              {`* Data shown is for the last ${queryPeriodDays} days`}
            </div>
          </div>
        ) : (
          <TabContents gridCols={1}>
            <AlertMessage message="No builds for this repo in the last three months" />
          </TabContents>
        )
      ) : (
        <Loading />
      )}
    </TabContents>
  );
};

export default (
  builds: RepoAnalysis['builds'],
  repositoryId: string,
  repositoryName: string,
  buildsCount?: number
): Tab => {
  return {
    title: 'Builds',
    count: buildsCount ?? (builds?.count || 0),
    Component: () => {
      return <Builds repositoryId={repositoryId} repositoryName={repositoryName} />;
    },
  };
};
