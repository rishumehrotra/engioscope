import React, { Fragment, lazy, useCallback } from 'react';
import { multiply, prop } from 'rambda';

import type { DrawerDownloadSlugs } from '../../backend/server/repo-api-endpoints.js';
import useSse from '../hooks/use-merge-over-sse.js';
import { useQueryPeriodDays } from '../hooks/query-hooks.js';
import { bold, isDefined, minPluralise, num, pluralise } from '../helpers/utils.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { Stat, SummaryCard } from '../components/SummaryCard.jsx';
import {
  decreaseIsBetter,
  increaseIsBetter,
} from '../components/graphs/TinyAreaGraph.jsx';
import UsageByEnv from '../components/UsageByEnv.jsx';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import TeamsSelector from '../components/teams-selector/TeamsSelector.jsx';
import type { SummaryStats } from '../../backend/models/repo-listing.js';
import type { ReleaseStatsSse } from '../../backend/models/release-listing.js';
import {
  useCreateUrlForReleasePipelinesSummary,
  useCreateUrlForRepoSummary,
} from '../helpers/sseUrlConfigs.js';
import ValueMetrics from '../components/OverviewWithMetrics/ValueMetrics.jsx';

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

const useCreateDownloadUrl = () => {
  // Dirty hack, but works
  const url = useCreateUrlForRepoSummary('overview-v2/::placeholder::');
  return useCallback(
    (slug: DrawerDownloadSlugs) => {
      return url.replace('::placeholder::', slug);
    },
    [url]
  );
};

const OverviewWithMetrics = () => {
  const repoSummarySseUrl = useCreateUrlForRepoSummary('repos/summary');
  const releasePipelinesSseUrl =
    useCreateUrlForReleasePipelinesSummary('release-pipelines');
  const drawerDownloadUrl = useCreateDownloadUrl();
  const repoSummaryStats = useSse<SummaryStats>(repoSummarySseUrl, '0');
  const releasePipelinesStats = useSse<ReleaseStatsSse>(releasePipelinesSseUrl, '0');
  const queryPeriodDays = useQueryPeriodDays();

  return (
    <div>
      <div className="text-left mb-6">
        <QueryPeriodSelector />
      </div>
      <ValueMetrics />
      <div className="text-2xl font-medium pt-6">Health Metrics</div>
      <TeamsSelector />
      <div className="my-3">
        {isDefined(repoSummaryStats.totalRepos) &&
        isDefined(repoSummaryStats.totalActiveRepos) &&
        repoSummaryStats.totalRepos - repoSummaryStats.totalActiveRepos !== 0 ? (
          <p className="text-theme-helptext text-sm">
            {`Analyzed ${num(repoSummaryStats.totalActiveRepos)} repos, 
            Excluded `}
            <b className="text-theme-helptext-emphasis">
              {`${num(repoSummaryStats.totalRepos - repoSummaryStats.totalActiveRepos)} `}
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
                repoSummaryStats.totalRepos - repoSummaryStats.totalActiveRepos,
                'repository',
                'repositories'
              )}`}
            </span>
            {' from analysis'}
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">Test Automation</h3>
        <div className="grid grid-cols-6 grid-row-2 gap-6 mt-2">
          <SummaryCard className="col-span-3 grid grid-cols-2 gap-6 rounded-lg">
            <div className="border-r border-theme-seperator pr-6">
              <Stat
                title="Tests"
                tooltip={
                  isDefined(repoSummaryStats.defSummary) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? [
                        'Total number of tests from the<br />',
                        bold(num(repoSummaryStats.defSummary.reposWithTests)),
                        'out of',
                        bold(num(repoSummaryStats.totalActiveRepos)),
                        minPluralise(
                          repoSummaryStats.totalActiveRepos,
                          'repository',
                          'repositories'
                        ),
                        'reporting test runs',
                      ].join(' ')
                    : undefined
                }
                value={(() => {
                  if (!isDefined(repoSummaryStats.weeklyTestsSummary)) return null;
                  const lastMatch = repoSummaryStats.weeklyTestsSummary.findLast(
                    x => x.hasTests
                  );
                  if (!lastMatch) return '0';
                  if (!lastMatch.hasTests) {
                    throw new Error("Stupid TS can't figure out that hasTests is true");
                  }
                  return num(lastMatch.totalTests);
                })()}
                graphPosition="right"
                graphData={repoSummaryStats.weeklyTestsSummary}
                graphColor={
                  isDefined(repoSummaryStats.weeklyTestsSummary)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklyTestsSummary.map(x =>
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
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('tests-coverage-pipelines'),
                  body: <TestsDrawer pipelineType="all" />,
                }}
              />
            </div>
            <div className="h-full">
              <Stat
                title="Branch coverage"
                tooltip={
                  isDefined(repoSummaryStats.defSummary) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? [
                        'Coverage numbers are from only the<br />',
                        bold(num(repoSummaryStats.defSummary.reposWithCoverage)),
                        'out of',
                        bold(num(repoSummaryStats.totalActiveRepos)),
                        minPluralise(
                          repoSummaryStats.totalActiveRepos,
                          'repository',
                          'repositories'
                        ),
                        'reporting coverage',
                      ].join(' ')
                    : undefined
                }
                value={(() => {
                  if (!isDefined(repoSummaryStats.weeklyCoverageSummary)) return null;
                  const lastMatch = repoSummaryStats.weeklyCoverageSummary.findLast(
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
                graphData={repoSummaryStats.weeklyCoverageSummary}
                graphColor={
                  isDefined(repoSummaryStats.weeklyCoverageSummary)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklyCoverageSummary.map(week => {
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
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">Code quality</h3>
        <div className="grid grid-cols-6 grid-row-2 gap-6 mt-2">
          <SummaryCard className="col-span-3 row-span-2 grid grid-cols-2 gap-6 rounded-lg">
            <div className="row-span-2 border-r border-theme-seperator pr-6">
              <Stat
                title="SonarQube"
                tooltip={
                  isDefined(repoSummaryStats.reposWithSonarQube) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? [
                        bold(num(repoSummaryStats.reposWithSonarQube)),
                        'of',
                        bold(num(repoSummaryStats.totalActiveRepos)),
                        minPluralise(
                          repoSummaryStats.totalActiveRepos,
                          'repository has',
                          'repositories have'
                        ),
                        'SonarQube configured',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.reposWithSonarQube) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? divide(
                        repoSummaryStats.reposWithSonarQube,
                        repoSummaryStats.totalActiveRepos
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="bottom"
                graphData={repoSummaryStats.weeklyReposWithSonarQubeCount}
                graphColor={
                  isDefined(repoSummaryStats.weeklyReposWithSonarQubeCount)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklyReposWithSonarQubeCount.map(w => w.count)
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
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="all" />,
                }}
              />
            </div>
            <div>
              <Stat
                title="Ok"
                tooltip={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? [
                        bold(num(repoSummaryStats.sonarProjects.passedProjects)),
                        'of',
                        bold(num(repoSummaryStats.sonarProjects.totalProjects)),
                        'SonarQube',
                        minPluralise(
                          repoSummaryStats.sonarProjects.totalProjects,
                          'project has',
                          'projects have'
                        ),
                        "'pass' quality gate",
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? divide(
                        repoSummaryStats.sonarProjects.passedProjects,
                        repoSummaryStats.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="right"
                graphData={repoSummaryStats.weeklySonarProjectsCount}
                graphItemToValue={prop('passedProjects')}
                graphColor={
                  isDefined(repoSummaryStats.weeklySonarProjectsCount)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklySonarProjectsCount.map(
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
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="pass" />,
                }}
              />
            </div>
            <div>
              <Stat
                title="Fail"
                tooltip={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? [
                        bold(num(repoSummaryStats.sonarProjects.failedProjects)),
                        'of',
                        bold(num(repoSummaryStats.sonarProjects.totalProjects)),
                        'SonarQube',
                        minPluralise(
                          repoSummaryStats.sonarProjects.failedProjects,
                          'project has',
                          'projects have'
                        ),
                        "'fail' quality gate",
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? divide(
                        repoSummaryStats.sonarProjects.failedProjects,
                        repoSummaryStats.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="right"
                graphData={repoSummaryStats.weeklySonarProjectsCount}
                graphColor={decreaseIsBetter(
                  repoSummaryStats.weeklySonarProjectsCount?.map(s => s.failedProjects) ||
                    []
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
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="fail" />,
                }}
              />
            </div>
          </SummaryCard>
          <SummaryCard className="col-span-1 row-span-1 rounded-lg">
            <Stat
              title="Healthy branches"
              tooltip={
                isDefined(repoSummaryStats.healthyBranches)
                  ? [
                      bold(num(repoSummaryStats.healthyBranches.healthy)),
                      'out of',
                      bold(num(repoSummaryStats.healthyBranches.total)),
                      minPluralise(
                        repoSummaryStats.healthyBranches.total,
                        'branch is',
                        'branches are'
                      ),
                      'healthy',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(repoSummaryStats.healthyBranches)
                  ? divide(
                      repoSummaryStats.healthyBranches.healthy,
                      repoSummaryStats.healthyBranches.total
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
            />
          </SummaryCard>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">CI builds</h3>
        <SummaryCard className="col-span-6 rounded-lg mt-2">
          <div className="grid grid-cols-4 gap-6">
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="Builds"
                tooltip="Total number of builds across all matching repos"
                value={
                  isDefined(repoSummaryStats.totalBuilds)
                    ? num(repoSummaryStats.totalBuilds.count)
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="all" />,
                }}
                graphPosition="right"
                graphColor={
                  isDefined(repoSummaryStats.totalBuilds)
                    ? increaseIsBetter(
                        repoSummaryStats.totalBuilds.byWeek.map(week => week.count)
                      )
                    : null
                }
                graphData={repoSummaryStats.totalBuilds?.byWeek}
                graphDataPointLabel={x => `${bold(num(x.count))} builds`}
                graphItemToValue={prop('count')}
              />
            </div>
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="Success"
                tooltip={
                  isDefined(repoSummaryStats.successfulBuilds) &&
                  isDefined(repoSummaryStats.totalBuilds)
                    ? [
                        bold(num(repoSummaryStats.successfulBuilds.count)),
                        'out of',
                        bold(num(repoSummaryStats.totalBuilds.count)),
                        minPluralise(
                          repoSummaryStats.totalBuilds.count,
                          'build has',
                          'builds have'
                        ),
                        'succeeded',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.successfulBuilds) &&
                  isDefined(repoSummaryStats.totalBuilds)
                    ? divide(
                        repoSummaryStats.successfulBuilds.count,
                        repoSummaryStats.totalBuilds.count
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="currentlySucceeding" />,
                }}
                graphPosition="right"
                graphColor={
                  isDefined(repoSummaryStats.totalBuilds)
                    ? increaseIsBetter(
                        repoSummaryStats.totalBuilds.byWeek.map(build => {
                          const successfulBuildsForWeek = isDefined(
                            repoSummaryStats.successfulBuilds
                          )
                            ? repoSummaryStats.successfulBuilds.byWeek.find(
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
                graphData={repoSummaryStats.totalBuilds?.byWeek}
                graphItemToValue={build => {
                  const successfulBuildsForWeek = isDefined(
                    repoSummaryStats.successfulBuilds
                  )
                    ? repoSummaryStats.successfulBuilds.byWeek.find(
                        s => s.weekIndex === build.weekIndex
                      )
                    : undefined;
                  return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                    .map(multiply(100))
                    .getOr(0);
                }}
                graphDataPointLabel={build => {
                  const successfulBuildsForWeek = isDefined(
                    repoSummaryStats.successfulBuilds
                  )
                    ? repoSummaryStats.successfulBuilds.byWeek.find(
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
                  isDefined(repoSummaryStats.pipelines)
                    ? [
                        bold(num(repoSummaryStats.pipelines.yamlCount)),
                        'of',
                        bold(num(repoSummaryStats.pipelines.totalCount)),
                        minPluralise(
                          repoSummaryStats.pipelines.totalCount,
                          'pipeline is',
                          'pipelines are'
                        ),
                        'set up using a YAML-based configuration',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.pipelines)
                    ? divide(
                        repoSummaryStats.pipelines.yamlCount,
                        repoSummaryStats.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Pipeline details',
                  enabledIf: (repoSummaryStats?.pipelines?.totalCount || 0) > 0,
                  downloadUrl: drawerDownloadUrl('yaml-pipelines'),
                  body: (
                    <YAMLPipelinesDrawer
                      totalPipelines={repoSummaryStats?.pipelines?.totalCount || 0}
                      yamlPipelines={repoSummaryStats?.pipelines?.yamlCount || 0}
                    />
                  ),
                }}
              />
            </div>
            <div>
              <Stat
                title="Central template"
                tooltip={
                  isDefined(repoSummaryStats.centralTemplatePipeline) &&
                  isDefined(repoSummaryStats.pipelines) &&
                  isDefined(repoSummaryStats.centralTemplateUsage) &&
                  isDefined(repoSummaryStats.totalBuilds) &&
                  isDefined(repoSummaryStats.activePipelinesCount) &&
                  isDefined(repoSummaryStats.activePipelineWithCentralTemplateCount) &&
                  isDefined(repoSummaryStats.activePipelineCentralTemplateBuilds) &&
                  isDefined(repoSummaryStats.activePipelineBuilds)
                    ? [
                        bold(
                          num(
                            repoSummaryStats.centralTemplatePipeline
                              .totalCentralTemplatePipelines
                          )
                        ),
                        'out of',
                        bold(num(repoSummaryStats.pipelines.totalCount)),
                        minPluralise(
                          repoSummaryStats.centralTemplatePipeline.central,
                          'build pipeline',
                          'build pipelines'
                        ),
                        'use the central template',
                        '<div class="mt-1">',
                        bold(num(repoSummaryStats.centralTemplatePipeline.central)),
                        'out of',
                        bold(num(repoSummaryStats.pipelines.totalCount)),
                        minPluralise(
                          repoSummaryStats.centralTemplatePipeline.central,
                          'build pipeline',
                          'build pipelines'
                        ),
                        'use the central template on the master branch',
                        '</div>',
                        '<div class="mt-1">',
                        bold(num(repoSummaryStats.centralTemplateUsage.templateUsers)),
                        'out of',
                        bold(num(repoSummaryStats.totalBuilds.count)),
                        minPluralise(
                          repoSummaryStats.centralTemplateUsage.templateUsers,
                          'build run',
                          'build runs'
                        ),
                        'used the central template',
                        '</div>',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.centralTemplatePipeline) &&
                  isDefined(repoSummaryStats.pipelines)
                    ? divide(
                        repoSummaryStats.centralTemplatePipeline
                          .totalCentralTemplatePipelines,
                        repoSummaryStats.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="usingCentralTemplate" />,
                }}
              />
            </div>
          </div>
        </SummaryCard>
      </div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">Releases</h3>
        <div className="grid grid-cols-4 grid-row-2 gap-6 mt-2 col-span-6">
          <SummaryCard className="col-span-2 rounded-lg mt-2 gap-6">
            <div className="grid grid-cols-2 gap-6">
              {isDefined(releasePipelinesStats.releases) &&
              isDefined(releasePipelinesStats.releases?.stagesToHighlight) ? (
                releasePipelinesStats.releases.stagesToHighlight.map(stage => (
                  <Fragment key={stage.name}>
                    <div className="pr-6 border-r border-theme-seperator">
                      <Stat
                        title={`${stage.name}: exists`}
                        value={divide(
                          stage.exists,
                          releasePipelinesStats.releases?.pipelineCount || 0
                        )
                          .map(toPercentage)
                          .getOr('-')}
                        tooltip={`${num(stage.exists)} out of ${pluralise(
                          releasePipelinesStats.releases?.pipelineCount || 0,
                          'release pipeline has',
                          'release pipelines have'
                        )} a stage named (or containing) ${stage.name}.`}
                      />
                    </div>
                    <div>
                      <Stat
                        title={`${stage.name}: used`}
                        value={divide(
                          stage.used,
                          releasePipelinesStats.releases?.pipelineCount || 0
                        )
                          .map(toPercentage)
                          .getOr('-')}
                        tooltip={`${num(stage.used)} out of ${pluralise(
                          releasePipelinesStats.releases?.pipelineCount || 0,
                          'release piipeline has',
                          'release pipelines have'
                        )} a successful deployment from ${stage.name}.`}
                      />
                    </div>
                  </Fragment>
                ))
              ) : (
                <div className="col-span-2">
                  <Stat title="Stages to highlight" value="-" />
                </div>
              )}
            </div>
          </SummaryCard>

          <SummaryCard className="col-span-1 rounded-lg mt-2 gap-6">
            <Stat
              title="Conforms to branch policies"
              value={
                isDefined(releasePipelinesStats.releasesBranchPolicy)
                  ? divide(
                      releasePipelinesStats.releasesBranchPolicy.conforms,
                      releasePipelinesStats.releasesBranchPolicy.total
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesStats.releasesBranchPolicy) &&
                isDefined(releasePipelinesStats.releases)
                  ? `${num(
                      releasePipelinesStats.releasesBranchPolicy.conforms
                    )} out of ${pluralise(
                      releasePipelinesStats.releasesBranchPolicy.total,
                      'artifact is',
                      'artifacts are'
                    )} from branches that conform<br />to the branch policy.${
                      isDefined(releasePipelinesStats.releases.ignoredStagesBefore)
                        ? `<br />Artifacts that didn't go to ${releasePipelinesStats.releases.ignoredStagesBefore} are not considered.`
                        : ''
                    }`
                  : undefined
              }
            />
          </SummaryCard>
          <SummaryCard className="col-span-1 rounded-lg mt-2 gap-6">
            <Stat
              title="Starts with artifact"
              value={
                isDefined(releasePipelinesStats.releases)
                  ? divide(
                      releasePipelinesStats.releases.startsWithArtifact,
                      releasePipelinesStats.releases.pipelineCount
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesStats.releases)
                  ? `${num(
                      releasePipelinesStats.releases.startsWithArtifact
                    )} of ${pluralise(
                      releasePipelinesStats.releases.pipelineCount,
                      'pipeliine',
                      'pipelines'
                    )} started with an artifact`
                  : undefined
              }
            />
          </SummaryCard>
        </div>
        <div className="grid grid-cols-4 grid-row-2 gap-6 mt-2 col-span-6">
          <SummaryCard className="col-span-2 row-span-2 grid grid-cols-2 gap-6 rounded-lg">
            {isDefined(releasePipelinesStats.usageByEnv) ? (
              <div className="col-span-2">
                <h3 className="font-semibold mb-3 flex items-center">
                  Usage By Environments
                </h3>
                <UsageByEnv perEnvUsage={releasePipelinesStats.usageByEnv} />
              </div>
            ) : (
              <div className="col-span-2">
                <Stat title="Usage By Environments" value="-" />
              </div>
            )}
          </SummaryCard>
          <SummaryCard className="col-span-1 row-span-1 rounded-lg">
            <Stat
              title="Master-only releases"
              value={
                isDefined(releasePipelinesStats.releases)
                  ? divide(
                      releasePipelinesStats.releases.masterOnly,
                      releasePipelinesStats.releases.runCount
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesStats.releases)
                  ? `${num(releasePipelinesStats.releases.masterOnly)} out of ${pluralise(
                      releasePipelinesStats.releases.runCount,
                      'release was',
                      'releases were'
                    )} exclusively from master.${
                      releasePipelinesStats.releases.ignoredStagesBefore
                        ? `<br />Pipeline runs that didn't go to ${releasePipelinesStats.releases.ignoredStagesBefore} are not considered.`
                        : ''
                    }`
                  : undefined
              }
            />
          </SummaryCard>
        </div>
      </div>
    </div>
  );
};

export default OverviewWithMetrics;
