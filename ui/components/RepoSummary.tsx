import { compose, multiply, not } from 'rambda';
import React, { useMemo } from 'react';
import {
  buildPipelines,
  healthyBranches,
  isInactive,
  isYmlPipeline,
  newSonarSetupsByWeek,
  reposWithPipelines,
  sonarCountsByWeek,
  totalBuilds,
  totalBuildsByWeek,
  totalCoverage,
  totalCoverageByWeek,
  totalSuccessfulBuildsByWeek,
  totalTests,
  totalTestsByWeek,
  totalUsingCentralTemplate,
} from '../../shared/repo-utils.js';
import type {
  RepoAnalysis,
  QualityGateStatus,
  UICodeQuality,
} from '../../shared/types.js';
import { divide, exists, toPercentage } from '../../shared/utils.js';
import { num } from '../helpers/utils.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import { LabelWithSparkline } from './graphs/Sparkline.js';
import ProjectStat from './ProjectStat.js';
import ProjectStats from './ProjectStats.js';
import { decreaseIsBetter, increaseIsBetter } from './summary-page/utils.js';
import { trpc } from '../helpers/trpc.js';
import { useDateRange } from '../hooks/date-range-hooks.jsx';
import { useCollectionAndProject } from '../hooks/query-hooks.js';
import NonYamlPipeLineBuilds from './NonYamlPipelineBuilds.jsx';

const buildSuccessRate = (repos: RepoAnalysis[]) => {
  const aggregated = repos
    .flatMap(r => r.builds?.pipelines || [])
    .reduce(
      (acc, curr) => {
        acc.success += curr.success;
        acc.count += curr.count;
        return acc;
      },
      { success: 0, count: 0 }
    );

  return aggregated.count === 0
    ? '0%'
    : `${((aggregated.success * 100) / aggregated.count).toFixed(0)}%`;
};

const qualityGateIs =
  (gate: QualityGateStatus) => (codeQuality: NonNullable<UICodeQuality>[number]) =>
    codeQuality.quality.gate === gate;

const sonarStats = (repos: RepoAnalysis[]) =>
  repos.reduce(
    (acc, r) => ({
      ...acc,
      configured: acc.configured + (r.codeQuality || []).length,
      ok: acc.ok + (r.codeQuality || []).filter(qualityGateIs('pass')).length,
      warn: acc.warn + (r.codeQuality || []).filter(qualityGateIs('warn')).length,
      error: acc.error + (r.codeQuality || []).filter(qualityGateIs('fail')).length,
    }),
    {
      configured: 0,
      ok: 0,
      warn: 0,
      error: 0,
    }
  );

const active = compose(not, isInactive);
const notYmlPipeline = compose(not, isYmlPipeline);

const computeStats = (reposBeforeExclusions: RepoAnalysis[]) => {
  const repos = reposBeforeExclusions.filter(active);
  const allBuildPipelines = buildPipelines(repos);
  const pipelinesRunningTests = repos.flatMap(r => r.tests || []);
  const pipelinesPostingBranchCoverage = repos
    .flatMap(r => r.tests?.flatMap(t => t.coverage))
    .filter(exists);

  return {
    repos,
    newSonarByWeek: newSonarSetupsByWeek(repos),
    sonarCountsByWeek: sonarCountsByWeek(repos),
    sonarStats: sonarStats(repos),
    buildPipelines: allBuildPipelines,
    ymlPipelines: allBuildPipelines.filter(isYmlPipeline),
    reposWithPipelines: reposWithPipelines(repos),
    reposWithNonYmlPipelines: repos.filter(
      r =>
        (r.builds?.pipelines.length || 0) > 0 &&
        (r.builds?.pipelines.filter(notYmlPipeline) || []).length > 0
    ),
    totalTests: totalTests(repos),
    totalTestsByWeek: totalTestsByWeek(repos),
    totalBuilds: totalBuilds(repos),
    totalBuildsByWeek: totalBuildsByWeek(repos),
    buildSuccessRate: buildSuccessRate(repos),
    totalSuccessfulBuildsByWeek: totalSuccessfulBuildsByWeek(repos),
    totalCoverage: totalCoverage(repos),
    totalCoverageByWeek: totalCoverageByWeek(repos),
    usingCentralTemplate: { ...totalUsingCentralTemplate(repos) },
    healthBranches: healthyBranches(repos),
    pipelinesRunningTests,
    pipelinesPostingBranchCoverage,
  };
};

type RepoSummaryProps = {
  repos: RepoAnalysis[];
  queryPeriodDays: number;
};

const RepoSummary: React.FC<RepoSummaryProps> = ({ repos, queryPeriodDays }) => {
  const stats = useMemo(() => computeStats(repos), [repos]);
  const { collectionName, project } = useCollectionAndProject();
  const dateRange = useDateRange();
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asString);

  const summaries = trpc.repos.getSummaries.useQuery({
    collectionName,
    project,
    searchTerm: search || undefined,
    groupsIncluded: selectedGroupLabels ? selectedGroupLabels.split(',') : undefined,
    ...dateRange,
  });

  return (
    <ProjectStats
      note={
        repos.length - stats.repos.length === 0 ? undefined : (
          <>
            {'Excluded '}
            <b>{repos.length - stats.repos.length}</b>
            {' inactive repositories from analysis'}
          </>
        )
      }
    >
      <ProjectStat
        topStats={[
          {
            title: 'Sonar',
            value: stats.repos.length ? (
              <LabelWithSparkline
                label={`${Math.round(
                  (stats.repos.filter(r => !!r.codeQuality).length / stats.repos.length) *
                    100
                )}%`}
                data={stats.newSonarByWeek}
                lineColor={increaseIsBetter(stats.newSonarByWeek)}
              />
            ) : (
              '-'
            ),
            tooltip: `${stats.repos.filter(r => !!r.codeQuality).length} of ${
              stats.repos.length
            } repos have SonarQube configured`,
          },
        ]}
        childStats={[
          {
            title: 'Ok',
            value: stats.sonarStats.configured ? (
              <LabelWithSparkline
                label={`${(
                  (stats.sonarStats.ok / stats.sonarStats.configured) *
                  100
                ).toFixed(0)}%`}
                data={stats.sonarCountsByWeek.pass}
                lineColor={increaseIsBetter(stats.sonarCountsByWeek.pass)}
              />
            ) : (
              '-'
            ),
            tooltip: `${stats.sonarStats.ok} of ${stats.sonarStats.configured} sonar projects have 'pass' quality gate`,
          },
          {
            title: 'Warn',
            value: stats.sonarStats.configured ? (
              <LabelWithSparkline
                label={`${(
                  (stats.sonarStats.warn / stats.sonarStats.configured) *
                  100
                ).toFixed(0)}%`}
                data={stats.sonarCountsByWeek.warn}
                lineColor={increaseIsBetter(stats.sonarCountsByWeek.warn)}
              />
            ) : (
              '-'
            ),
            tooltip: `${stats.sonarStats.warn} of ${stats.sonarStats.configured} sonar projects have 'warn' quality gate`,
          },
          {
            title: 'Fail',
            value: stats.sonarStats.configured ? (
              <LabelWithSparkline
                label={`${(
                  (stats.sonarStats.error / stats.sonarStats.configured) *
                  100
                ).toFixed(0)}%`}
                data={stats.sonarCountsByWeek.fail}
                lineColor={decreaseIsBetter(stats.sonarCountsByWeek.fail)}
              />
            ) : (
              '-'
            ),
            tooltip: `${stats.sonarStats.error} of ${stats.sonarStats.configured} sonar projects have 'fail' quality gate`,
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Tests',
            value: (
              <LabelWithSparkline
                label={num(stats.totalTests)}
                data={stats.totalTestsByWeek}
                lineColor={increaseIsBetter(stats.totalTestsByWeek)}
              />
            ),
            tooltip: `Total number of tests across all matching repos.`,
          },
        ]}
        childStats={[
          {
            title: 'Coverage',
            value: (
              <LabelWithSparkline
                label={divide(stats.totalCoverage.covered, stats.totalCoverage.total)
                  .map(toPercentage)
                  .getOr('-')}
                data={stats.totalCoverageByWeek}
                lineColor={increaseIsBetter(stats.totalCoverageByWeek)}
                yAxisLabel={x => `${x}%`}
              />
            ),
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Pipelines running tests',
            value: divide(stats.pipelinesRunningTests.length, stats.buildPipelines.length)
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(stats.pipelinesRunningTests.length)} of ${num(
              stats.buildPipelines.length
            )} pipelines report test results`,
          },
        ]}
        childStats={[
          {
            title: 'Reporting coverage',
            value: divide(
              stats.pipelinesPostingBranchCoverage.length,
              stats.buildPipelines.length
            )
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(stats.pipelinesPostingBranchCoverage.length)} of ${num(
              stats.buildPipelines.length
            )} pipelines report branch coverage`,
          },
        ]}
      />
      {summaries.data ? (
        <>
          <ProjectStat
            topStats={[
              {
                title: 'Builds',
                value: (
                  <LabelWithSparkline
                    label={num(summaries.data.totalBuilds.count)}
                    data={summaries.data.totalBuilds.byWeek.map(week => week.count)}
                    lineColor={increaseIsBetter(
                      summaries.data.totalBuilds.byWeek.map(week => week.count)
                    )}
                  />
                ),
                tooltip: 'Total number of builds across all matching repos',
              },
            ]}
            childStats={[
              {
                title: 'Success',
                value: (
                  <LabelWithSparkline
                    label={summaries.data.successRate}
                    data={summaries.data.weeklySuccess.map(week => {
                      return divide(week.successes, week.count)
                        .map(multiply(100))
                        .getOr(0);
                    })}
                    lineColor={increaseIsBetter(
                      summaries.data.weeklySuccess.map(week => {
                        return divide(week.successes, week.count)
                          .map(multiply(100))
                          .getOr(0);
                      })
                    )}
                    yAxisLabel={x => `${x}%`}
                  />
                ),
                tooltip: `${num(summaries.data.successfulBuilds.count)} out of ${num(
                  summaries.data.totalBuilds.count
                )} are successful builds`,
              },
            ]}
          />
          <ProjectStat
            topStats={[
              {
                title: 'Healthy branches',
                tooltip: `${num(summaries.data.healthyBranches.healthy)} out of ${num(
                  summaries.data.healthyBranches.total
                )} are Healthy Branches`,
                value: divide(
                  summaries.data.healthyBranches.healthy,
                  summaries.data.healthyBranches.total
                )
                  .map(toPercentage)
                  .getOr('-'),
              },
            ]}
          />
          <ProjectStat
            topStats={[
              {
                title: 'Has releases',
                tooltip: `${num(summaries.data.hasReleasesReposCount)} out of ${num(
                  summaries.data.totalActiveRepos
                )} repos have made releases in the last ${queryPeriodDays} days`,
                value: divide(
                  summaries.data.hasReleasesReposCount,
                  summaries.data.totalActiveRepos
                )
                  .map(toPercentage)
                  .getOr('-'),
              },
            ]}
          />
          <ProjectStat
            topStats={[
              {
                title: 'YAML pipelines',
                value: divide(
                  summaries.data.yamlPipelines.yamlCount,
                  summaries.data.yamlPipelines.totalCount
                )
                  .map(toPercentage)
                  .getOr('-'),
                tooltip: `${num(summaries.data.yamlPipelines.yamlCount)} of ${num(
                  summaries.data.yamlPipelines.totalCount
                )} pipelines use a YAML-based configuration`,
              },
            ]}
            onClick={
              summaries.data.yamlPipelines.totalCount ===
              summaries.data.yamlPipelines.yamlCount
                ? undefined
                : {
                    open: 'modal',
                    heading: 'Pipelines not using YAML-based configuration',
                    subheading: `(${
                      summaries.data.yamlPipelines.totalCount -
                      summaries.data.yamlPipelines.yamlCount
                    })`,
                    body: <NonYamlPipeLineBuilds queryPeriodDays={queryPeriodDays} />,
                  }
            }
          />
          <ProjectStat
            topStats={[
              {
                title: 'Central template usage',
                tooltip: `${num(
                  summaries.data.centralTemplatePipeline.central
                )} out of ${num(
                  summaries.data.centralTemplatePipeline.total
                )} build pipelines use the central template on the master branch <br>
                  ${num(summaries.data.totalCentralTemplate.templateUsers)} out of ${num(
                  summaries.data.totalBuilds.count
                )} build runs used the central template`,
                value: divide(
                  summaries.data.centralTemplatePipeline.central,
                  summaries.data.centralTemplatePipeline.total
                )
                  .map(toPercentage)
                  .getOr('-'),
              },
            ]}
          />
        </>
      ) : (
        <ProjectStat
          topStats={[
            {
              title: 'Loading...',
              value: '...',
            },
          ]}
        />
      )}
    </ProjectStats>
  );
};
export default RepoSummary;
