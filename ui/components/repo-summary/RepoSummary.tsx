import { last, multiply, prop } from 'rambda';
import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { divide, toPercentage } from '../../../shared/utils.js';
import { minPluralise, num } from '../../helpers/utils.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import useSse from '../../hooks/use-merge-over-sse.js';
import type { SummaryStats } from '../../../backend/models/repo-listing.js';
import { Stat, SummaryCard } from '../SummaryCard.jsx';
import useRepoFilters from '../../hooks/use-repo-filters.js';
import type { DrawerDownloadSlugs } from '../../../backend/server/repo-api-endpoints.js';
import { decreaseIsBetter, increaseIsBetter } from '../graphs/TinyAreaGraph.jsx';

const YAMLPipelinesDrawer = lazy(() => import('./YAMLPipelinesDrawer.jsx'));
const SonarReposDrawer = lazy(() => import('./SonarReposDrawer.jsx'));
const TestsDrawer = lazy(() => import('./TestsDrawer.jsx'));

const BuildPipelinesDrawer = lazy(() => import('./BuildPipelinesDrawer.jsx'));

const isDefined = <T,>(val: T | undefined): val is T => val !== undefined;

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
  const url = useCreateUrlWithFilter('repos/::placeholder::');

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

const bold = (x: string | number) => `<span class="font-medium">${x}</span>`;

const StreamingRepoSummary: React.FC = () => {
  const sseUrl = useCreateUrlWithFilter('repos/summary');
  const drawerDownloadUrl = useCreateDownloadUrl();
  const key = useUpdateSummary();
  const summaries = useSse<SummaryStats>(sseUrl, key);

  return (
    <>
      <div className="grid grid-cols-4 gap-6">
        <SummaryCard className="col-span-2 grid grid-cols-2 gap-6">
          <div className="row-span-2 border-r border-theme-seperator pr-6">
            <Stat
              title="SonarQube"
              tooltip={
                isDefined(summaries.reposWithSonarQube) &&
                isDefined(summaries.totalActiveRepos)
                  ? [
                      bold(num(summaries.reposWithSonarQube)),
                      'of',
                      bold(num(summaries.totalActiveRepos)),
                      minPluralise(
                        summaries.totalActiveRepos,
                        'repository has',
                        'repositories have'
                      ),
                      'SonarQube configured',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(summaries.reposWithSonarQube) &&
                isDefined(summaries.totalActiveRepos)
                  ? divide(summaries.reposWithSonarQube, summaries.totalActiveRepos)
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
              graphPosition="bottom"
              graphData={summaries.weeklyReposWithSonarQubeCount}
              graphColor={
                isDefined(summaries.weeklyReposWithSonarQubeCount)
                  ? increaseIsBetter(
                      summaries.weeklyReposWithSonarQubeCount.map(w => w.count)
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
                enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                downloadUrl: drawerDownloadUrl('sonar-projects'),
                body: <SonarReposDrawer projectsType="all" />,
              }}
            />
          </div>
          <div>
            <Stat
              title="Ok"
              tooltip={
                isDefined(summaries.sonarProjects)
                  ? [
                      bold(num(summaries.sonarProjects.passedProjects)),
                      'of',
                      bold(num(summaries.sonarProjects.totalProjects)),
                      'SonarQube',
                      minPluralise(
                        summaries.sonarProjects.totalProjects,
                        'project has',
                        'projects have'
                      ),
                      "'pass' quality gate",
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(summaries.sonarProjects)
                  ? divide(
                      summaries.sonarProjects.passedProjects,
                      summaries.sonarProjects.totalProjects
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
              graphPosition="right"
              graphData={summaries.weeklySonarProjectsCount}
              graphItemToValue={prop('passedProjects')}
              graphColor={
                isDefined(summaries.weeklySonarProjectsCount)
                  ? increaseIsBetter(
                      summaries.weeklySonarProjectsCount.map(s => s.passedProjects)
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
                enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                downloadUrl: drawerDownloadUrl('sonar-projects'),
                body: <SonarReposDrawer projectsType="pass" />,
              }}
            />
          </div>
          <div>
            <Stat
              title="Fail"
              tooltip={
                isDefined(summaries.sonarProjects)
                  ? [
                      bold(num(summaries.sonarProjects.failedProjects)),
                      'of',
                      bold(num(summaries.sonarProjects.totalProjects)),
                      'SonarQube',
                      minPluralise(
                        summaries.sonarProjects.failedProjects,
                        'project has',
                        'projects have'
                      ),
                      "'fail' quality gate",
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(summaries.sonarProjects)
                  ? divide(
                      summaries.sonarProjects.failedProjects,
                      summaries.sonarProjects.totalProjects
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
              graphPosition="right"
              graphData={summaries.weeklySonarProjectsCount}
              graphColor={decreaseIsBetter(
                summaries.weeklySonarProjectsCount?.map(s => s.failedProjects) || []
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
                enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                downloadUrl: drawerDownloadUrl('sonar-projects'),
                body: <SonarReposDrawer projectsType="fail" />,
              }}
            />
          </div>
        </SummaryCard>

        <SummaryCard className="col-span-2 grid grid-cols-2 gap-6">
          <div className="border-r border-theme-seperator pr-6">
            <Stat
              title="Tests"
              tooltip={
                isDefined(summaries.defSummary) && isDefined(summaries.totalActiveRepos)
                  ? [
                      'Total number of tests from the<br />',
                      bold(num(summaries.defSummary.reposWithTests)),
                      'out of',
                      bold(num(summaries.totalActiveRepos)),
                      minPluralise(
                        summaries.totalActiveRepos,
                        'repository',
                        'repositories'
                      ),
                      'reporting test runs',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(summaries.weeklyTestsSummary)
                  ? num(last(summaries.weeklyTestsSummary)?.totalTests || 0)
                  : null
              }
              graphPosition="bottom"
              graphData={summaries.weeklyTestsSummary}
              graphColor={
                isDefined(summaries.weeklyTestsSummary)
                  ? increaseIsBetter(summaries.weeklyTestsSummary.map(t => t.totalTests))
                  : null
              }
              graphItemToValue={prop('totalTests')}
              graphDataPointLabel={x =>
                [
                  bold(num(x.totalTests)),
                  minPluralise(x.totalTests, 'test', 'tests'),
                ].join(' ')
              }
              onClick={{
                open: 'drawer',
                heading: 'Test & coverage details',
                enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                downloadUrl: drawerDownloadUrl('tests-coverage-pipelines'),
                body: <TestsDrawer pipelineType="all" />,
              }}
            />
          </div>
          <div className="h-full">
            <Stat
              title="Branch coverage"
              tooltip={
                isDefined(summaries.defSummary) && isDefined(summaries.totalActiveRepos)
                  ? [
                      'Coverage numbers are from only the<br />',
                      bold(num(summaries.defSummary.reposWithCoverage)),
                      'out of',
                      bold(num(summaries.totalActiveRepos)),
                      minPluralise(
                        summaries.totalActiveRepos,
                        'repository',
                        'repositories'
                      ),
                      'reporting coverage',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(summaries.weeklyCoverageSummary)
                  ? divide(
                      last(summaries.weeklyCoverageSummary)?.coveredBranches || 0,
                      last(summaries.weeklyCoverageSummary)?.totalBranches || 0
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
              graphPosition="bottom"
              graphData={summaries.weeklyCoverageSummary}
              graphColor={
                isDefined(summaries.weeklyCoverageSummary)
                  ? increaseIsBetter(
                      summaries.weeklyCoverageSummary.map(week => {
                        return divide(week.coveredBranches || 0, week.totalBranches || 0)
                          .map(multiply(100))
                          .getOr(0);
                      })
                    )
                  : null
              }
              graphItemToValue={x => {
                return divide(x.coveredBranches, x.totalBranches)
                  .map(multiply(100))
                  .getOr(0);
              }}
              graphDataPointLabel={x =>
                [
                  bold(
                    divide(x.coveredBranches, x.totalBranches)
                      .map(toPercentage)
                      .getOr('Unknown')
                  ),
                  'branch coverage',
                ].join(' ')
              }
            />
          </div>
        </SummaryCard>

        <SummaryCard className="col-span-4">
          <div className="grid grid-cols-5 gap-6">
            <div className="border-r border-theme-seperator">
              <Stat
                title="Branch policies"
                tooltip={
                  summaries.branchPolicies
                    ? [
                        bold(num(summaries.branchPolicies.conformingBranches)),
                        'out of',
                        bold(num(summaries.branchPolicies.totalBranches)),
                        minPluralise(
                          summaries.branchPolicies.totalBranches,
                          'release branch conforms',
                          'release branches conform'
                        ),
                        'to branch policies',
                        '<div class="mt-1">',
                        bold(num(summaries.branchPolicies.conformingRepos)),
                        'out of',
                        bold(num(summaries.branchPolicies.repoCount)),
                        minPluralise(
                          summaries.branchPolicies.repoCount,
                          'repository',
                          'repositories'
                        ),
                        'produced artifacts from branches<br />',
                        'that conform to branch policies',
                        '</div>',
                      ].join(' ')
                    : undefined
                }
                value={
                  summaries.branchPolicies
                    ? divide(
                        summaries.branchPolicies.conformingBranches,
                        summaries.branchPolicies.totalBranches
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : '-'
                }
              />
            </div>
            <div className="border-r border-theme-seperator">
              <Stat
                title="Healthy branches"
                tooltip={
                  isDefined(summaries.healthyBranches)
                    ? [
                        bold(num(summaries.healthyBranches.healthy)),
                        'out of',
                        bold(num(summaries.healthyBranches.total)),
                        minPluralise(
                          summaries.healthyBranches.total,
                          'branch is',
                          'branches are'
                        ),
                        'healthy',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(summaries.healthyBranches)
                    ? divide(
                        summaries.healthyBranches.healthy,
                        summaries.healthyBranches.total
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
              />
            </div>
            <div className="border-r border-theme-seperator">
              <Stat
                title="Has releases"
                tooltip={
                  isDefined(summaries.hasReleasesReposCount) &&
                  isDefined(summaries.totalActiveRepos)
                    ? [
                        bold(num(summaries.hasReleasesReposCount)),
                        'out of',
                        bold(num(summaries.totalActiveRepos)),
                        minPluralise(
                          summaries.totalActiveRepos,
                          'repository has',
                          'repositories have'
                        ),
                        'made releases',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(summaries.hasReleasesReposCount) &&
                  isDefined(summaries.totalActiveRepos)
                    ? divide(summaries.hasReleasesReposCount, summaries.totalActiveRepos)
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
              />
            </div>
            <div className="border-r border-theme-seperator">
              <Stat
                title="YAML pipelines"
                tooltip={
                  isDefined(summaries.pipelines)
                    ? [
                        bold(num(summaries.pipelines.yamlCount)),
                        'of',
                        bold(num(summaries.pipelines.totalCount)),
                        minPluralise(
                          summaries.pipelines.totalCount,
                          'pipeline is',
                          'pipelines are'
                        ),
                        'set up using a YAML-based configuration',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(summaries.pipelines)
                    ? divide(
                        summaries.pipelines.yamlCount,
                        summaries.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Pipeline details',
                  enabledIf: (summaries?.pipelines?.totalCount || 0) > 0,
                  downloadUrl: drawerDownloadUrl('yaml-pipelines'),
                  body: (
                    <YAMLPipelinesDrawer
                      totalPipelines={summaries?.pipelines?.totalCount || 0}
                      yamlPipelines={summaries?.pipelines?.yamlCount || 0}
                    />
                  ),
                }}
              />
            </div>
            <div>
              <Stat
                title="Central template"
                tooltip={
                  isDefined(summaries.centralTemplatePipeline) &&
                  isDefined(summaries.pipelines) &&
                  isDefined(summaries.centralTemplateUsage) &&
                  isDefined(summaries.totalBuilds) &&
                  isDefined(summaries.activePipelinesCount) &&
                  isDefined(summaries.activePipelineWithCentralTemplateCount) &&
                  isDefined(summaries.activePipelineCentralTemplateBuilds) &&
                  isDefined(summaries.activePipelineBuilds)
                    ? [
                        bold(num(summaries.centralTemplatePipeline.central)),
                        'out of',
                        bold(num(summaries.pipelines.totalCount)),
                        minPluralise(
                          summaries.centralTemplatePipeline.central,
                          'build pipeline',
                          'build pipelines'
                        ),
                        'use the central template on the master branch',
                        '<div class="mt-1">',
                        bold(num(summaries.centralTemplateUsage.templateUsers)),
                        'out of',
                        bold(num(summaries.totalBuilds.count)),
                        minPluralise(
                          summaries.centralTemplateUsage.templateUsers,
                          'build run',
                          'build runs'
                        ),
                        'used the central template',
                        '</div>',
                        // ${num(summaries.activePipelineWithCentralTemplateCount)} out of ${num(
                        //   summaries.activePipelinesCount
                        // )}<br>
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(summaries.centralTemplatePipeline) &&
                  isDefined(summaries.pipelines)
                    ? divide(
                        summaries.centralTemplatePipeline.central,
                        summaries.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="usingCentralTemplate" />,
                }}
              />
            </div>
          </div>
        </SummaryCard>
        <SummaryCard className="col-span-2 grid grid-cols-2 gap-6">
          <div className="border-r border-theme-seperator pr-6">
            <Stat
              title="Builds"
              tooltip="Total number of builds across all matching repos"
              value={
                isDefined(summaries.totalBuilds) ? num(summaries.totalBuilds.count) : null
              }
              onClick={{
                open: 'drawer',
                heading: 'Build details',
                enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                downloadUrl: drawerDownloadUrl('build-pipelines'),
                body: <BuildPipelinesDrawer pipelineType="all" />,
              }}
              graphPosition="right"
              graphColor={
                isDefined(summaries.totalBuilds)
                  ? increaseIsBetter(summaries.totalBuilds.byWeek.map(week => week.count))
                  : null
              }
              graphData={summaries.totalBuilds?.byWeek}
              graphDataPointLabel={x => `${bold(num(x.count))} builds`}
              graphItemToValue={prop('count')}
            />
          </div>
          <div>
            <Stat
              title="Success"
              tooltip={
                isDefined(summaries.successfulBuilds) && isDefined(summaries.totalBuilds)
                  ? [
                      bold(num(summaries.successfulBuilds.count)),
                      'out of',
                      bold(num(summaries.totalBuilds.count)),
                      minPluralise(
                        summaries.totalBuilds.count,
                        'build has',
                        'builds have'
                      ),
                      'succeeded',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(summaries.successfulBuilds) && isDefined(summaries.totalBuilds)
                  ? divide(summaries.successfulBuilds.count, summaries.totalBuilds.count)
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
              onClick={{
                open: 'drawer',
                heading: 'Build details',
                enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                downloadUrl: drawerDownloadUrl('build-pipelines'),
                body: <BuildPipelinesDrawer pipelineType="currentlySucceeding" />,
              }}
              graphPosition="right"
              graphColor={
                isDefined(summaries.totalBuilds)
                  ? increaseIsBetter(
                      summaries.totalBuilds.byWeek.map(build => {
                        const successfulBuildsForWeek = isDefined(
                          summaries.successfulBuilds
                        )
                          ? summaries.successfulBuilds.byWeek.find(
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
              graphData={summaries.totalBuilds?.byWeek}
              graphItemToValue={build => {
                const successfulBuildsForWeek = isDefined(summaries.successfulBuilds)
                  ? summaries.successfulBuilds.byWeek.find(
                      s => s.weekIndex === build.weekIndex
                    )
                  : undefined;
                return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                  .map(multiply(100))
                  .getOr(0);
              }}
              graphDataPointLabel={build => {
                const successfulBuildsForWeek = isDefined(summaries.successfulBuilds)
                  ? summaries.successfulBuilds.byWeek.find(
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
        </SummaryCard>
        <SummaryCard className="col-span-2 grid grid-cols-2 gap-6">
          <div className="border-r border-theme-seperator pr-6">
            <Stat
              title="Pipelines running tests"
              tooltip={
                isDefined(summaries.defSummary)
                  ? [
                      bold(num(summaries.defSummary.defsWithTests)),
                      'of',
                      bold(num(summaries.defSummary.totalDefs)),
                      minPluralise(
                        summaries.defSummary.totalDefs,
                        'pipeline reports',
                        'pipelines report'
                      ),
                      'test results',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(summaries.defSummary)
                  ? divide(
                      summaries.defSummary.defsWithTests,
                      summaries.defSummary.totalDefs
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
              graphPosition="right"
              graphData={summaries.weeklyPipelinesWithTestsCount}
              graphColor={
                isDefined(summaries.weeklyPipelinesWithTestsCount)
                  ? increaseIsBetter(
                      summaries.weeklyPipelinesWithTestsCount.map(w => w.defsWithTests)
                    )
                  : null
              }
              graphItemToValue={prop('defsWithTests')}
              graphDataPointLabel={x =>
                [
                  bold(num(x.defsWithTests)),
                  minPluralise(x.defsWithTests, 'pipeline runs', 'pipelines run'),
                  'tests',
                ].join(' ')
              }
              onClick={{
                open: 'drawer',
                heading: 'Test & coverage details',
                enabledIf: (summaries?.totalActiveRepos || 0) > 0,
                downloadUrl: drawerDownloadUrl('tests-coverage-pipelines'),
                body: <TestsDrawer pipelineType="withTests" />,
              }}
            />
          </div>
          <Stat
            title="Reporting coverage"
            tooltip={
              isDefined(summaries.defSummary)
                ? [
                    bold(num(summaries.defSummary.defsWithCoverage)),
                    'of',
                    bold(num(summaries.defSummary.totalDefs)),
                    minPluralise(
                      summaries.defSummary.totalDefs,
                      'pipeline reports',
                      'pipelines report'
                    ),
                    'branch coverage',
                  ].join(' ')
                : undefined
            }
            value={
              isDefined(summaries.defSummary)
                ? divide(
                    summaries.defSummary.defsWithCoverage,
                    summaries.defSummary.totalDefs
                  )
                    .map(toPercentage)
                    .getOr('-')
                : null
            }
            graphPosition="right"
            graphData={summaries.weeklyPipelinesWithCoverageCount}
            graphColor={
              isDefined(summaries.weeklyPipelinesWithCoverageCount)
                ? increaseIsBetter(
                    summaries.weeklyPipelinesWithCoverageCount.map(
                      w => w.defsWithCoverage
                    )
                  )
                : null
            }
            graphItemToValue={prop('defsWithCoverage')}
            graphDataPointLabel={x =>
              [
                bold(num(x.defsWithCoverage)),
                minPluralise(x.defsWithCoverage, 'pipeline reports', 'pipelines report'),
                'coverage',
              ].join(' ')
            }
            onClick={{
              open: 'drawer',
              heading: 'Test & coverage details',
              enabledIf: (summaries?.totalActiveRepos || 0) > 0,
              downloadUrl: drawerDownloadUrl('tests-coverage-pipelines'),
              body: <TestsDrawer pipelineType="withCoverage" />,
            }}
          />
        </SummaryCard>
      </div>
      {isDefined(summaries.totalRepos) &&
      isDefined(summaries.totalActiveRepos) &&
      summaries.totalRepos - summaries.totalActiveRepos !== 0 ? (
        <p className="mt-5 text-theme-helptext ml-1">
          {'Excluded '}
          <b className="text-theme-helptext-emphasis">
            {summaries.totalRepos - summaries.totalActiveRepos}
          </b>
          {' inactive repositories from analysis'}
        </p>
      ) : null}
    </>
  );
};

export default StreamingRepoSummary;
