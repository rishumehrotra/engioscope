import { compose, not } from 'rambda';
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
  UIBuildPipeline,
  QualityGateStatus,
  UICodeQuality,
} from '../../shared/types.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { num, shortDate } from '../helpers/utils.js';
import { LabelWithSparkline } from './graphs/Sparkline.js';
import ProjectStat from './ProjectStat.js';
import ProjectStats from './ProjectStats.js';
import { decreaseIsBetter, increaseIsBetter } from './summary-page/utils.js';

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

const pipelineLastUsed = (pipeline: UIBuildPipeline) => {
  if (pipeline.status.type === 'unknown') return 'Unknown';
  if (pipeline.status.type === 'succeeded') return 'Within the last 3 months';
  if (!pipeline.status.since) return 'Unknown';
  return `${shortDate(new Date(pipeline.status.since))}, ${new Date(
    pipeline.status.since
  ).getFullYear()}`;
};

const active = compose(not, isInactive);
const notYmlPipeline = compose(not, isYmlPipeline);

const computeStats = (reposBeforeExclusions: RepoAnalysis[]) => {
  const repos = reposBeforeExclusions.filter(active);
  const allBuildPipelines = buildPipelines(repos);

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
  };
};

type RepoSummaryProps = {
  repos: RepoAnalysis[];
  queryPeriodDays: number;
};

const RepoSummary: React.FC<RepoSummaryProps> = ({ repos, queryPeriodDays }) => {
  const stats = useMemo(() => computeStats(repos), [repos]);

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
            tooltip: 'Total number of tests across all matching repos',
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
            title: 'Builds',
            value: (
              <LabelWithSparkline
                label={num(stats.totalBuilds)}
                data={stats.totalBuildsByWeek}
                lineColor={increaseIsBetter(stats.totalBuildsByWeek)}
              />
            ),
            tooltip: 'Total number of builds across all matching repos',
          },
        ]}
        childStats={[
          {
            title: 'Success',
            // value: stats.buildSuccessRate,
            value: (
              <LabelWithSparkline
                label={stats.buildSuccessRate}
                data={stats.totalSuccessfulBuildsByWeek}
                lineColor={increaseIsBetter(stats.totalSuccessfulBuildsByWeek)}
                yAxisLabel={x => `${x}%`}
              />
            ),
            tooltip: 'Success rate across all matching repos',
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'YAML pipelines',
            value: divide(stats.ymlPipelines.length, stats.buildPipelines.length)
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(stats.ymlPipelines.length)} of ${num(
              stats.buildPipelines.length
            )} pipelines use a YAML-based configuration`,
          },
        ]}
        onClick={
          stats.ymlPipelines.length === stats.buildPipelines.length
            ? undefined
            : {
                open: 'modal',
                heading: 'Pipelines not using YAML-based configuration',
                subheading: `(${
                  stats.buildPipelines.length - stats.ymlPipelines.length
                })`,
                body: (
                  <>
                    {stats.reposWithNonYmlPipelines.map((repo, index) => {
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      const pipelines = repo.builds!.pipelines.filter(notYmlPipeline);

                      return (
                        <details key={repo.id} className="mb-3" open={index === 0}>
                          <summary className="font-semibold text-lg cursor-pointer">
                            {`${repo.name} (${pipelines.length})`}
                          </summary>

                          <div className="bg-gray-100 pt-2 pb-4 px-4 rounded-lg mt-4">
                            <table className="table-auto text-center divide-y divide-gray-200 w-full">
                              <thead>
                                <tr>
                                  {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                                  <th className="px-6 py-3 text-xs w-2/6 font-medium text-gray-800 uppercase tracking-wider" />
                                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                                    {`Runs in the last ${queryPeriodDays} days`}
                                  </th>
                                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                                    Last used
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                                {pipelines.map(pipeline => (
                                  <tr key={pipeline.name}>
                                    <td className="pl-6 py-4 whitespace-nowrap text-left">
                                      <a
                                        href={pipeline.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="link-text"
                                      >
                                        {pipeline.name}
                                      </a>
                                    </td>
                                    <td>
                                      {pipeline.status.type === 'unused'
                                        ? '-'
                                        : num(pipeline.count)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {pipelineLastUsed(pipeline)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      );
                    })}
                  </>
                ),
              }
        }
      />
      <ProjectStat
        topStats={[
          {
            title: 'Has releases',
            tooltip: `${num(stats.reposWithPipelines.length)} out of ${num(
              stats.repos.length
            )} repos have made releases in the last ${queryPeriodDays} days`,
            value: divide(stats.reposWithPipelines.length, stats.repos.length)
              .map(toPercentage)
              .getOr('-'),
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Using central template',
            value: `${divide(
              stats.usingCentralTemplate.count,
              stats.usingCentralTemplate.total
            )
              .map(toPercentage)
              .getOr('-')}`,
            tooltip: `${num(stats.usingCentralTemplate.count)} out of ${num(
              stats.usingCentralTemplate.total
            )} build runs used the central template`,
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Healthy branches',
            value: divide(stats.healthBranches.count, stats.healthBranches.total)
              .map(toPercentage)
              .getOr('-'),
          },
        ]}
      />
    </ProjectStats>
  );
};

export default RepoSummary;
