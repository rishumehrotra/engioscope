import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { multiply, prop } from 'rambda';
import { Info } from 'react-feather';
import type { DrawerDownloadSlugs } from '../../backend/server/repo-api-endpoints.js';
import useRepoFilters from '../hooks/use-repo-filters.js';
import useSse from '../hooks/use-merge-over-sse.js';
import { useQueryContext, useQueryPeriodDays } from '../hooks/query-hooks.js';
import type { ProjectOverviewStats } from '../../backend/models/project-overview.js';
import { minPluralise, num } from '../helpers/utils.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { Stat, SummaryCard } from '../components/SummaryCard.jsx';
import {
  decreaseIsBetter,
  increaseIsBetter,
} from '../components/graphs/TinyAreaGraph.jsx';

const YAMLPipelinesDrawer = lazy(
  () => import('../components/repo-summary/YAMLPipelinesDrawer.jsx')
);
const SonarReposDrawer = lazy(
  () => import('../components/repo-summary/SonarReposDrawer.jsx')
);
const TestsDrawer = lazy(() => import('../components/repo-summary/TestsDrawer.jsx'));

const BuildPipelinesDrawer = lazy(
  () => import('../components/repo-summary/BuildPipelinesDrawer.jsx')
);

const isDefined = <T,>(val: T | undefined): val is T => val !== undefined;
const bold = (x: string | number) => `<span class="font-medium">${x}</span>`;

const useCreateUrlWithFilter = (slug: string) => {
  const filters = useRepoFilters();
  const queryContext = useQueryContext();
  return useMemo(() => {
    return `/api/${queryContext[0]}/${queryContext[1]}/${slug}?${new URLSearchParams({
      startDate: filters.queryContext[2].toISOString(),
      endDate: filters.queryContext[3].toISOString(),
      ...(filters.searchTerms?.length ? { search: filters.searchTerms?.join(',') } : {}),
      ...(filters.teams ? { teams: filters.teams.join(',') } : {}),
    }).toString()}`;
  }, [filters.queryContext, filters.searchTerms, filters.teams, queryContext, slug]);
};

const useCreateDownloadUrl = () => {
  // Dirty hack, but works
  const url = useCreateUrlWithFilter('overview-v2/::placeholder::');

  return useCallback(
    (slug: DrawerDownloadSlugs) => {
      return url.replace('::placeholder::', slug);
    },
    [url]
  );
};

const useUpdateSummary = () => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const updateKey = () => {
      setKey(x => x + 1);
    };
    document.body.addEventListener('teams:updated', updateKey);
    return () => {
      document.body.removeEventListener('teams:updated', updateKey);
    };
  });

  return key.toString();
};

const OverviewWithMetrics = () => {
  const sseUrl = useCreateUrlWithFilter('overview-v2');
  const drawerDownloadUrl = useCreateDownloadUrl();
  const key = useUpdateSummary();
  const projectOverviewStats = useSse<ProjectOverviewStats>(sseUrl, key);
  const queryPeriodDays = useQueryPeriodDays();

  return (
    <div>
      <div className="text-gray-950 text-2xl font-medium mb-3">Value Metrics</div>
      <div className="mb-2">
        <h2 className="text-gray-950 text-sm font-normal uppercase mb-2">Flow metrics</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h4 className="text-gray-950 text-md font-medium">Incoming</h4>
            <table className="overview-table text-gray-950 text-base font-normal">
              <thead>
                <tr>
                  <td>Work Item Type</td>
                  <td>
                    New
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                </tr>
              </thead>
              <tbody>
                {isDefined(projectOverviewStats.workItems?.flowMetrics.incoming.new) &&
                  projectOverviewStats.workItems?.flowMetrics?.incoming.new.map(item => (
                    <tr key={item.workItemType}>
                      <td>{item.workItemType}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h4 className="text-gray-950 text-md font-medium">Completed</h4>
            <table className="overview-table text-gray-950 text-base font-normal">
              <thead>
                <tr>
                  <td>Work Item Type</td>
                  <td>
                    Velocity
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                  <td>
                    Cycle Time
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                  <td>
                    CLT
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                  <td>
                    Flow Efficiency
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h4 className="text-gray-950 text-md font-medium">WIP</h4>
            <table className="overview-table text-gray-950 text-base font-normal">
              <thead>
                <tr>
                  <td>Work Item Type</td>
                  <td>
                    WIP Trend
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
        </div>
      </div>
      <div className="mb-2">
        <h2 className="text-gray-950 text-sm font-normal uppercase mb-2">
          Quality metrics
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h4 className="text-gray-950 text-md font-medium">Incoming</h4>
            <table className="overview-table text-gray-950 text-base font-normal">
              <thead>
                <tr>
                  <td>Work Item Type</td>
                  <td>
                    New
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                </tr>
              </thead>
            </table>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h4 className="text-gray-950 text-md font-medium">Completed</h4>
            <table className="overview-table text-gray-950 text-base font-normal">
              <thead>
                <tr>
                  <td>Work Item Type</td>
                  <td>
                    Velocity
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                  <td>
                    Cycle Time
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                  <td>
                    CLT
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                  <td>
                    Flow Efficiency
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
            <h4 className="text-gray-950 text-md font-medium">WIP</h4>
            <table className="overview-table text-gray-950 text-base font-normal">
              <thead>
                <tr>
                  <td>Work Item Type</td>
                  <td>
                    WIP Trend
                    <span className="inline-block pl-1">
                      <Info size={15} />
                    </span>
                  </td>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
        </div>
      </div>
      <div className="text-gray-950 text-2xl font-medium">Health Metrics</div>
      <div className="mb-3">
        {isDefined(projectOverviewStats.totalRepos) &&
        isDefined(projectOverviewStats.totalActiveRepos) &&
        projectOverviewStats.totalRepos - projectOverviewStats.totalActiveRepos !== 0 ? (
          <p className="mt-5 text-theme-helptext ml-1">
            {`Analyzed ${num(projectOverviewStats.totalActiveRepos)} repos, 
            Excluded `}
            <b className="text-theme-helptext-emphasis">
              {num(
                projectOverviewStats.totalRepos - projectOverviewStats.totalActiveRepos
              )}
            </b>
            <span
              className="underline decoration-dashed"
              data-tooltip-id="react-tooltip"
              data-tooltip-html={[
                'A repository is considered inactive if it has had<br />',
                "<span class='font-medium'>no commits</span> and <span class='font-medium'>no builds</span>",
                `in the last ${queryPeriodDays} days`,
              ].join(' ')}
            >
              {`inactive ${minPluralise(
                projectOverviewStats.totalRepos - projectOverviewStats.totalActiveRepos,
                'repository',
                'repositories'
              )}`}
            </span>
            {' from analysis'}
          </p>
        ) : null}
      </div>
      <div className="text-gray-950 text-md font-normal uppercase mb-2">
        Test Automation
        <div className="grid grid-cols-6 grid-row-2 gap-6">
          <SummaryCard className="col-span-3 grid grid-cols-2 gap-6">
            <div className="border-r border-theme-seperator pr-6">
              <Stat
                title="Tests"
                tooltip={
                  isDefined(projectOverviewStats.defSummary) &&
                  isDefined(projectOverviewStats.totalActiveRepos)
                    ? [
                        'Total number of tests from the<br />',
                        bold(num(projectOverviewStats.defSummary.reposWithTests)),
                        'out of',
                        bold(num(projectOverviewStats.totalActiveRepos)),
                        minPluralise(
                          projectOverviewStats.totalActiveRepos,
                          'repository',
                          'repositories'
                        ),
                        'reporting test runs',
                      ].join(' ')
                    : undefined
                }
                value={(() => {
                  if (!isDefined(projectOverviewStats.weeklyTestsSummary)) return null;
                  const lastMatch = projectOverviewStats.weeklyTestsSummary.findLast(
                    x => x.hasTests
                  );
                  if (!lastMatch) return '0';
                  if (!lastMatch.hasTests) {
                    throw new Error("Stupid TS can't figure out that hasTests is true");
                  }
                  return num(lastMatch.totalTests);
                })()}
                graphPosition="right"
                graphData={projectOverviewStats.weeklyTestsSummary}
                graphColor={
                  isDefined(projectOverviewStats.weeklyTestsSummary)
                    ? increaseIsBetter(
                        projectOverviewStats.weeklyTestsSummary.map(x =>
                          x.hasTests ? x.totalTests : 0
                        )
                      )
                    : null
                }
                graphItemToValue={x => (x.hasTests ? x.totalTests : undefined)}
                graphDataPointLabel={x =>
                  [
                    bold(num(x.hasTests ? x.totalTests : 0)),
                    minPluralise(x.hasTests ? x.totalTests : 0, 'test', 'tests'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Test & coverage details',
                  enabledIf: (projectOverviewStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('tests-coverage-pipelines'),
                  body: <TestsDrawer pipelineType="all" />,
                }}
              />
            </div>
            <div className="h-full">
              <Stat
                title="Branch coverage"
                tooltip={
                  isDefined(projectOverviewStats.defSummary) &&
                  isDefined(projectOverviewStats.totalActiveRepos)
                    ? [
                        'Coverage numbers are from only the<br />',
                        bold(num(projectOverviewStats.defSummary.reposWithCoverage)),
                        'out of',
                        bold(num(projectOverviewStats.totalActiveRepos)),
                        minPluralise(
                          projectOverviewStats.totalActiveRepos,
                          'repository',
                          'repositories'
                        ),
                        'reporting coverage',
                      ].join(' ')
                    : undefined
                }
                value={(() => {
                  if (!isDefined(projectOverviewStats.weeklyCoverageSummary)) return null;
                  const lastMatch = projectOverviewStats.weeklyCoverageSummary.findLast(
                    x => x.hasCoverage
                  );
                  if (!lastMatch) return '-';
                  if (!lastMatch.hasCoverage) {
                    throw new Error("TS can't figure out that hasTests is true");
                  }
                  return divide(lastMatch.coveredBranches, lastMatch.totalBranches)
                    .map(toPercentage)
                    .getOr('-');
                })()}
                graphPosition="right"
                graphData={projectOverviewStats.weeklyCoverageSummary}
                graphColor={
                  isDefined(projectOverviewStats.weeklyCoverageSummary)
                    ? increaseIsBetter(
                        projectOverviewStats.weeklyCoverageSummary.map(week => {
                          return divide(
                            week.hasCoverage ? week.coveredBranches : 0,
                            week.hasCoverage ? week.totalBranches : 0
                          )
                            .map(multiply(100))
                            .getOr(0);
                        })
                      )
                    : null
                }
                graphItemToValue={x => {
                  return divide(
                    x.hasCoverage ? x.coveredBranches : 0,
                    x.hasCoverage ? x.totalBranches : 0
                  )
                    .map(multiply(100))
                    .getOr(0);
                }}
                graphDataPointLabel={x =>
                  [
                    bold(
                      divide(
                        x.hasCoverage ? x.coveredBranches : 0,
                        x.hasCoverage ? x.totalBranches : 0
                      )
                        .map(toPercentage)
                        .getOr('Unknown')
                    ),
                    'branch coverage',
                  ].join(' ')
                }
              />
            </div>
          </SummaryCard>
        </div>
      </div>
      <div className="text-gray-950 text-md font-normal uppercase mb-2">
        Code Quality
        <div className="grid grid-cols-6 grid-row-2 gap-6">
          <SummaryCard className="col-span-3 row-span-2 grid grid-cols-2 gap-6">
            <div className="row-span-2 border-r border-theme-seperator pr-6">
              <Stat
                title="SonarQube"
                tooltip={
                  isDefined(projectOverviewStats.reposWithSonarQube) &&
                  isDefined(projectOverviewStats.totalActiveRepos)
                    ? [
                        bold(num(projectOverviewStats.reposWithSonarQube)),
                        'of',
                        bold(num(projectOverviewStats.totalActiveRepos)),
                        minPluralise(
                          projectOverviewStats.totalActiveRepos,
                          'repository has',
                          'repositories have'
                        ),
                        'SonarQube configured',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(projectOverviewStats.reposWithSonarQube) &&
                  isDefined(projectOverviewStats.totalActiveRepos)
                    ? divide(
                        projectOverviewStats.reposWithSonarQube,
                        projectOverviewStats.totalActiveRepos
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="bottom"
                graphData={projectOverviewStats.weeklyReposWithSonarQubeCount}
                graphColor={
                  isDefined(projectOverviewStats.weeklyReposWithSonarQubeCount)
                    ? increaseIsBetter(
                        projectOverviewStats.weeklyReposWithSonarQubeCount.map(
                          w => w.count
                        )
                      )
                    : null
                }
                graphItemToValue={prop('count')}
                graphDataPointLabel={x =>
                  [
                    bold(num(x.count)),
                    minPluralise(x.count, 'repopsitory', 'repositories'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'SonarQube',
                  enabledIf: (projectOverviewStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="all" />,
                }}
              />
            </div>
            <div>
              <Stat
                title="Ok"
                tooltip={
                  isDefined(projectOverviewStats.sonarProjects)
                    ? [
                        bold(num(projectOverviewStats.sonarProjects.passedProjects)),
                        'of',
                        bold(num(projectOverviewStats.sonarProjects.totalProjects)),
                        'SonarQube',
                        minPluralise(
                          projectOverviewStats.sonarProjects.totalProjects,
                          'project has',
                          'projects have'
                        ),
                        "'pass' quality gate",
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(projectOverviewStats.sonarProjects)
                    ? divide(
                        projectOverviewStats.sonarProjects.passedProjects,
                        projectOverviewStats.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="right"
                graphData={projectOverviewStats.weeklySonarProjectsCount}
                graphItemToValue={prop('passedProjects')}
                graphColor={
                  isDefined(projectOverviewStats.weeklySonarProjectsCount)
                    ? increaseIsBetter(
                        projectOverviewStats.weeklySonarProjectsCount.map(
                          s => s.passedProjects
                        )
                      )
                    : null
                }
                graphDataPointLabel={x =>
                  [
                    bold(num(x.passedProjects)),
                    'SonarQube',
                    minPluralise(x.passedProjects, 'project', 'projects'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'SonarQube',
                  enabledIf: (projectOverviewStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="pass" />,
                }}
              />
            </div>
            <div>
              <Stat
                title="Fail"
                tooltip={
                  isDefined(projectOverviewStats.sonarProjects)
                    ? [
                        bold(num(projectOverviewStats.sonarProjects.failedProjects)),
                        'of',
                        bold(num(projectOverviewStats.sonarProjects.totalProjects)),
                        'SonarQube',
                        minPluralise(
                          projectOverviewStats.sonarProjects.failedProjects,
                          'project has',
                          'projects have'
                        ),
                        "'fail' quality gate",
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(projectOverviewStats.sonarProjects)
                    ? divide(
                        projectOverviewStats.sonarProjects.failedProjects,
                        projectOverviewStats.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="right"
                graphData={projectOverviewStats.weeklySonarProjectsCount}
                graphColor={decreaseIsBetter(
                  projectOverviewStats.weeklySonarProjectsCount?.map(
                    s => s.failedProjects
                  ) || []
                )}
                graphItemToValue={prop('failedProjects')}
                graphDataPointLabel={x =>
                  [
                    bold(num(x.failedProjects)),
                    'SonarQube',
                    minPluralise(x.failedProjects, 'project', 'projects'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'SonarQube',
                  enabledIf: (projectOverviewStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="fail" />,
                }}
              />
            </div>
          </SummaryCard>
          <SummaryCard className="col-span-1 row-span-1">
            <Stat
              title="Healthy branches"
              tooltip={
                isDefined(projectOverviewStats.healthyBranches)
                  ? [
                      bold(num(projectOverviewStats.healthyBranches.healthy)),
                      'out of',
                      bold(num(projectOverviewStats.healthyBranches.total)),
                      minPluralise(
                        projectOverviewStats.healthyBranches.total,
                        'branch is',
                        'branches are'
                      ),
                      'healthy',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(projectOverviewStats.healthyBranches)
                  ? divide(
                      projectOverviewStats.healthyBranches.healthy,
                      projectOverviewStats.healthyBranches.total
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
            />
          </SummaryCard>
        </div>
      </div>
      <div className="text-gray-950 text-md font-normal uppercase mb-2">
        CI Builds
        <SummaryCard className="col-span-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="Builds"
                tooltip="Total number of builds across all matching repos"
                value={
                  isDefined(projectOverviewStats.totalBuilds)
                    ? num(projectOverviewStats.totalBuilds.count)
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (projectOverviewStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="all" />,
                }}
                graphPosition="right"
                graphColor={
                  isDefined(projectOverviewStats.totalBuilds)
                    ? increaseIsBetter(
                        projectOverviewStats.totalBuilds.byWeek.map(week => week.count)
                      )
                    : null
                }
                graphData={projectOverviewStats.totalBuilds?.byWeek}
                graphDataPointLabel={x => `${bold(num(x.count))} builds`}
                graphItemToValue={prop('count')}
              />
            </div>
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="Success"
                tooltip={
                  isDefined(projectOverviewStats.successfulBuilds) &&
                  isDefined(projectOverviewStats.totalBuilds)
                    ? [
                        bold(num(projectOverviewStats.successfulBuilds.count)),
                        'out of',
                        bold(num(projectOverviewStats.totalBuilds.count)),
                        minPluralise(
                          projectOverviewStats.totalBuilds.count,
                          'build has',
                          'builds have'
                        ),
                        'succeeded',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(projectOverviewStats.successfulBuilds) &&
                  isDefined(projectOverviewStats.totalBuilds)
                    ? divide(
                        projectOverviewStats.successfulBuilds.count,
                        projectOverviewStats.totalBuilds.count
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (projectOverviewStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="currentlySucceeding" />,
                }}
                graphPosition="right"
                graphColor={
                  isDefined(projectOverviewStats.totalBuilds)
                    ? increaseIsBetter(
                        projectOverviewStats.totalBuilds.byWeek.map(build => {
                          const successfulBuildsForWeek = isDefined(
                            projectOverviewStats.successfulBuilds
                          )
                            ? projectOverviewStats.successfulBuilds.byWeek.find(
                                s => s.weekIndex === build.weekIndex
                              )
                            : null;
                          return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                            .map(multiply(100))
                            .getOr(0);
                        })
                      )
                    : null
                }
                graphData={projectOverviewStats.totalBuilds?.byWeek}
                graphItemToValue={build => {
                  const successfulBuildsForWeek = isDefined(
                    projectOverviewStats.successfulBuilds
                  )
                    ? projectOverviewStats.successfulBuilds.byWeek.find(
                        s => s.weekIndex === build.weekIndex
                      )
                    : undefined;
                  return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                    .map(multiply(100))
                    .getOr(0);
                }}
                graphDataPointLabel={build => {
                  const successfulBuildsForWeek = isDefined(
                    projectOverviewStats.successfulBuilds
                  )
                    ? projectOverviewStats.successfulBuilds.byWeek.find(
                        s => s.weekIndex === build.weekIndex
                      )
                    : undefined;
                  return [
                    bold(
                      divide(successfulBuildsForWeek?.count ?? 0, build.count)
                        .map(toPercentage)
                        .getOr('Unknown')
                    ),
                    'success rate',
                  ].join(' ');
                }}
              />
            </div>
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="YAML pipelines"
                tooltip={
                  isDefined(projectOverviewStats.pipelines)
                    ? [
                        bold(num(projectOverviewStats.pipelines.yamlCount)),
                        'of',
                        bold(num(projectOverviewStats.pipelines.totalCount)),
                        minPluralise(
                          projectOverviewStats.pipelines.totalCount,
                          'pipeline is',
                          'pipelines are'
                        ),
                        'set up using a YAML-based configuration',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(projectOverviewStats.pipelines)
                    ? divide(
                        projectOverviewStats.pipelines.yamlCount,
                        projectOverviewStats.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Pipeline details',
                  enabledIf: (projectOverviewStats?.pipelines?.totalCount || 0) > 0,
                  downloadUrl: drawerDownloadUrl('yaml-pipelines'),
                  body: (
                    <YAMLPipelinesDrawer
                      totalPipelines={projectOverviewStats?.pipelines?.totalCount || 0}
                      yamlPipelines={projectOverviewStats?.pipelines?.yamlCount || 0}
                    />
                  ),
                }}
              />
            </div>
            <div>
              <Stat
                title="Central template"
                tooltip={
                  isDefined(projectOverviewStats.centralTemplatePipeline) &&
                  isDefined(projectOverviewStats.pipelines) &&
                  isDefined(projectOverviewStats.centralTemplateUsage) &&
                  isDefined(projectOverviewStats.totalBuilds) &&
                  isDefined(projectOverviewStats.activePipelinesCount) &&
                  isDefined(
                    projectOverviewStats.activePipelineWithCentralTemplateCount
                  ) &&
                  isDefined(projectOverviewStats.activePipelineCentralTemplateBuilds) &&
                  isDefined(projectOverviewStats.activePipelineBuilds)
                    ? [
                        bold(
                          num(
                            projectOverviewStats.centralTemplatePipeline
                              .totalCentralTemplatePipelines
                          )
                        ),
                        'out of',
                        bold(num(projectOverviewStats.pipelines.totalCount)),
                        minPluralise(
                          projectOverviewStats.centralTemplatePipeline.central,
                          'build pipeline',
                          'build pipelines'
                        ),
                        'use the central template',
                        '<div class="mt-1">',
                        bold(num(projectOverviewStats.centralTemplatePipeline.central)),
                        'out of',
                        bold(num(projectOverviewStats.pipelines.totalCount)),
                        minPluralise(
                          projectOverviewStats.centralTemplatePipeline.central,
                          'build pipeline',
                          'build pipelines'
                        ),
                        'use the central template on the master branch',
                        '</div>',
                        '<div class="mt-1">',
                        bold(
                          num(projectOverviewStats.centralTemplateUsage.templateUsers)
                        ),
                        'out of',
                        bold(num(projectOverviewStats.totalBuilds.count)),
                        minPluralise(
                          projectOverviewStats.centralTemplateUsage.templateUsers,
                          'build run',
                          'build runs'
                        ),
                        'used the central template',
                        '</div>',
                        // ${num(projectOverviewStats.activePipelineWithCentralTemplateCount)} out of ${num(
                        //   projectOverviewStats.activePipelinesCount
                        // )}<br>
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(projectOverviewStats.centralTemplatePipeline) &&
                  isDefined(projectOverviewStats.pipelines)
                    ? divide(
                        projectOverviewStats.centralTemplatePipeline
                          .totalCentralTemplatePipelines,
                        projectOverviewStats.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (projectOverviewStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="usingCentralTemplate" />,
                }}
              />
            </div>
          </div>
        </SummaryCard>
      </div>
      <div className="text-gray-950 text-md font-normal uppercase mb-2">
        Releases
        <div className="grid grid-cols-4">
          <SummaryCard className="col-span-1">
            <div className="grid grid-cols-4 gap-6">
              <div className="col-span-1">
                <Stat
                  title="Has releases"
                  tooltip={
                    isDefined(projectOverviewStats.hasReleasesReposCount) &&
                    isDefined(projectOverviewStats.totalActiveRepos)
                      ? [
                          bold(num(projectOverviewStats.hasReleasesReposCount)),
                          'out of',
                          bold(num(projectOverviewStats.totalActiveRepos)),
                          minPluralise(
                            projectOverviewStats.totalActiveRepos,
                            'repository has',
                            'repositories have'
                          ),
                          'made releases',
                        ].join(' ')
                      : undefined
                  }
                  value={
                    isDefined(projectOverviewStats.hasReleasesReposCount) &&
                    isDefined(projectOverviewStats.totalActiveRepos)
                      ? divide(
                          projectOverviewStats.hasReleasesReposCount,
                          projectOverviewStats.totalActiveRepos
                        )
                          .map(toPercentage)
                          .getOr('-')
                      : null
                  }
                />
              </div>
            </div>
          </SummaryCard>
        </div>
      </div>
    </div>
  );
};

export default OverviewWithMetrics;
