import { last, multiply } from 'rambda';
import React from 'react';

import { divide, exists, toPercentage } from '../../shared/utils.js';
import { num, pluralise } from '../helpers/utils.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import { LabelWithSparkline } from './graphs/Sparkline.jsx';
import ProjectStat from './ProjectStat.jsx';
import ProjectStats from './ProjectStats.jsx';
import { decreaseIsBetter, increaseIsBetter } from './summary-page/utils.jsx';
import { useQueryContext } from '../hooks/query-hooks.js';
import NonYamlPipeLineBuilds from './NonYamlPipelineBuilds.jsx';
import useSse from '../hooks/use-merge-over-sse.js';
import type { SummaryStats } from '../../backend/models/repo-listing.js';

type RepoSummaryProps = {
  queryPeriodDays: number;
};

const isDefined = <T,>(val: T | undefined): val is T => val !== undefined;

const StreamingRepoSummary: React.FC<RepoSummaryProps> = ({ queryPeriodDays }) => {
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asString);
  const queryContext = useQueryContext();

  const summaries = useSse<SummaryStats>(
    `/api/${queryContext[0]}/${queryContext[1]}/repos/summary?${new URLSearchParams({
      startDate: queryContext[2].toISOString(),
      endDate: queryContext[3].toISOString(),
      ...(search ? { search } : {}),
      ...(selectedGroupLabels ? { groupsIncluded: selectedGroupLabels } : {}),
    }).toString()}`
  );

  if (!Object.entries(summaries).length) {
    return (
      <ProjectStats>
        <ProjectStat
          topStats={[
            {
              title: 'Loading...',
              value: '...',
            },
          ]}
        />
      </ProjectStats>
    );
  }

  return (
    <ProjectStats
      note={
        isDefined(summaries.totalRepos) && isDefined(summaries.totalActiveRepos) ? (
          summaries.totalRepos === summaries.totalActiveRepos ? undefined : (
            <>
              {'Excluded '}
              <b>{summaries.totalRepos - summaries.totalActiveRepos}</b>
              {' inactive repositories from analysis'}
            </>
          )
        ) : null
      }
    >
      <ProjectStat
        topStats={[
          {
            title: 'Sonar',
            value: (
              <LabelWithSparkline
                label={
                  isDefined(summaries.reposWithSonarQube) &&
                  isDefined(summaries.totalActiveRepos)
                    ? divide(summaries.reposWithSonarQube, summaries.totalActiveRepos)
                        .map(toPercentage)
                        .getOr('-')
                    : '...'
                }
                data={
                  isDefined(summaries.weeklyReposWithSonarQubeCount)
                    ? summaries.weeklyReposWithSonarQubeCount.map(w => w.count)
                    : []
                }
                lineColor={
                  isDefined(summaries.weeklyReposWithSonarQubeCount)
                    ? increaseIsBetter(
                        summaries.weeklyReposWithSonarQubeCount.map(w => w.count)
                      )
                    : undefined
                }
              />
            ),
            tooltip: `${summaries.reposWithSonarQube} of ${
              isDefined(summaries.totalActiveRepos)
                ? pluralise(summaries.totalActiveRepos, 'repo has', 'repos have')
                : '...'
            } SonarQube configured`,
          },
        ]}
        childStats={[
          isDefined(summaries.sonarProjects)
            ? summaries.sonarProjects.passedProjects === 0
              ? null
              : {
                  title: 'Ok',
                  value: (
                    <LabelWithSparkline
                      label={divide(
                        summaries.sonarProjects.passedProjects,
                        summaries.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')}
                      data={
                        isDefined(summaries.weeklySonarProjectsCount)
                          ? summaries.weeklySonarProjectsCount.map(s => s.passedProjects)
                          : []
                      }
                      lineColor={
                        isDefined(summaries.weeklySonarProjectsCount)
                          ? increaseIsBetter(
                              summaries.weeklySonarProjectsCount.map(
                                s => s.passedProjects
                              )
                            )
                          : ''
                      }
                    />
                  ),
                  tooltip: `${summaries.sonarProjects.passedProjects} of ${pluralise(
                    summaries.sonarProjects.totalProjects,
                    'sonar project has',
                    'sonar projects have'
                  )} 'pass' quality gate`,
                }
            : null,
          isDefined(summaries.sonarProjects)
            ? summaries.sonarProjects.projectsWithWarning === 0
              ? null
              : {
                  title: 'Warn',
                  value: (
                    <LabelWithSparkline
                      label={divide(
                        summaries.sonarProjects.projectsWithWarning,
                        summaries.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')}
                      data={
                        summaries.weeklySonarProjectsCount?.map(
                          s => s.projectsWithWarnings
                        ) || []
                      }
                      lineColor={increaseIsBetter(
                        summaries.weeklySonarProjectsCount?.map(
                          s => s.projectsWithWarnings
                        ) || []
                      )}
                    />
                  ),
                  tooltip: `${summaries.sonarProjects.projectsWithWarning} of ${summaries.sonarProjects.totalProjects} sonar projects have 'warn' quality gate`,
                }
            : null,
          isDefined(summaries.sonarProjects)
            ? summaries.sonarProjects.failedProjects === 0
              ? null
              : {
                  title: 'Fail',
                  value: (
                    <LabelWithSparkline
                      label={divide(
                        summaries.sonarProjects.failedProjects,
                        summaries.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')}
                      data={
                        summaries.weeklySonarProjectsCount?.map(s => s.failedProjects) ||
                        []
                      }
                      lineColor={decreaseIsBetter(
                        summaries.weeklySonarProjectsCount?.map(s => s.failedProjects) ||
                          []
                      )}
                    />
                  ),
                  tooltip: `${summaries.sonarProjects.failedProjects} of ${pluralise(
                    summaries.sonarProjects.totalProjects,
                    'sonar project has',
                    'sonar projects have'
                  )} 'fail' quality gate`,
                }
            : null,
        ].filter(exists)}
      />

      <ProjectStat
        topStats={[
          {
            title: 'Tests',
            value: isDefined(summaries.weeklyTestsSummary) ? (
              <LabelWithSparkline
                label={num(last(summaries.weeklyTestsSummary)?.totalTests || 0)}
                data={summaries.weeklyTestsSummary.map(t => t.totalTests)}
                lineColor={increaseIsBetter(
                  summaries.weeklyTestsSummary.map(t => t.totalTests)
                )}
              />
            ) : null,
            tooltip: `Total number of tests across all matching repos.`,
          },
        ]}
        childStats={[
          {
            title: 'Coverage',
            value: isDefined(summaries.weeklyCoverageSummary) ? (
              <LabelWithSparkline
                label={divide(
                  last(summaries.weeklyCoverageSummary)?.coveredBranches || 0,
                  last(summaries.weeklyCoverageSummary)?.totalBranches || 0
                )
                  .map(toPercentage)
                  .getOr('-')}
                data={summaries.weeklyCoverageSummary.map(week => {
                  return divide(week.coveredBranches, week.totalBranches)
                    .map(multiply(100))
                    .getOr(0);
                })}
                lineColor={increaseIsBetter(
                  summaries.weeklyCoverageSummary.map(week => {
                    return divide(week.coveredBranches || 0, week.totalBranches || 0)
                      .map(multiply(100))
                      .getOr(0);
                  })
                )}
                yAxisLabel={x => `${x}%`}
              />
            ) : null,
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Pipelines running tests',
            value: isDefined(summaries.defSummary)
              ? divide(summaries.defSummary.defsWithTests, summaries.defSummary.totalDefs)
                  .map(toPercentage)
                  .getOr('-')
              : '...',
            tooltip: isDefined(summaries.defSummary)
              ? `${num(summaries.defSummary.defsWithTests)} of ${num(
                  summaries.defSummary.totalDefs
                )} pipelines report test results`
              : undefined,
          },
        ]}
        childStats={[
          {
            title: 'Reporting coverage',
            value: isDefined(summaries.defSummary)
              ? divide(
                  summaries.defSummary.defsWithCoverage,
                  summaries.defSummary.totalDefs
                )
                  .map(toPercentage)
                  .getOr('-')
              : undefined,
            tooltip: isDefined(summaries.defSummary)
              ? `${num(summaries.defSummary.defsWithCoverage)} of ${num(
                  summaries.defSummary.totalDefs
                )} pipelines report branch coverage`
              : undefined,
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Builds',
            value: isDefined(summaries.totalBuilds) ? (
              <LabelWithSparkline
                label={num(summaries.totalBuilds.count)}
                data={summaries.totalBuilds.byWeek.map(week => week.count)}
                lineColor={increaseIsBetter(
                  summaries.totalBuilds.byWeek.map(week => week.count)
                )}
              />
            ) : null,
            tooltip: 'Total number of builds across all matching repos',
          },
        ]}
        childStats={[
          {
            title: 'Success',
            value:
              isDefined(summaries.successfulBuilds) &&
              isDefined(summaries.totalBuilds) ? (
                <LabelWithSparkline
                  label={divide(
                    summaries.successfulBuilds.count,
                    summaries.totalBuilds.count
                  )
                    .map(toPercentage)
                    .getOr('-')}
                  data={summaries.totalBuilds.byWeek.map(build => {
                    const successfulBuildsForWeek =
                      summaries.successfulBuilds?.byWeek.find(
                        s => s.weekIndex === build.weekIndex
                      );
                    return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                      .map(multiply(100))
                      .getOr(0);
                  })}
                  lineColor={increaseIsBetter(
                    summaries.totalBuilds.byWeek.map(build => {
                      const successfulBuildsForWeek =
                        summaries.successfulBuilds?.byWeek.find(
                          s => s.weekIndex === build.weekIndex
                        );
                      return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                        .map(multiply(100))
                        .getOr(0);
                    })
                  )}
                  yAxisLabel={x => `${x}%`}
                />
              ) : null,
            tooltip:
              isDefined(summaries.successfulBuilds) && isDefined(summaries.totalBuilds)
                ? `${num(summaries.successfulBuilds.count)} out of ${num(
                    summaries.totalBuilds.count
                  )} builds have succeeded`
                : undefined,
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Healthy branches',
            tooltip: isDefined(summaries.healthyBranches)
              ? `${num(summaries.healthyBranches.healthy)} out of ${num(
                  summaries.healthyBranches.total
                )} branches are healthy`
              : undefined,
            value: isDefined(summaries.healthyBranches)
              ? divide(summaries.healthyBranches.healthy, summaries.healthyBranches.total)
                  .map(toPercentage)
                  .getOr('-')
              : '...',
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Has releases',
            tooltip:
              isDefined(summaries.hasReleasesReposCount) &&
              isDefined(summaries.totalActiveRepos)
                ? `${num(summaries.hasReleasesReposCount)} out of ${num(
                    summaries.totalActiveRepos
                  )} repos have made releases in the last ${queryPeriodDays} days`
                : undefined,
            value:
              isDefined(summaries.hasReleasesReposCount) &&
              isDefined(summaries.totalActiveRepos)
                ? divide(summaries.hasReleasesReposCount, summaries.totalActiveRepos)
                    .map(toPercentage)
                    .getOr('-')
                : '...',
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'YAML pipelines',
            value: isDefined(summaries.pipelines)
              ? divide(summaries.pipelines.yamlCount, summaries.pipelines.totalCount)
                  .map(toPercentage)
                  .getOr('-')
              : undefined,
            tooltip: isDefined(summaries.pipelines)
              ? `${num(summaries.pipelines.yamlCount)} of ${num(
                  summaries.pipelines.totalCount
                )} pipelines are set up using a YAML-based configuration`
              : undefined,
          },
        ]}
        onClick={
          isDefined(summaries.pipelines)
            ? summaries.pipelines.totalCount === summaries.pipelines.yamlCount
              ? undefined
              : {
                  open: 'modal',
                  heading: 'Pipelines not using YAML-based configuration',
                  subheading: `(${
                    summaries.pipelines.totalCount - summaries.pipelines.yamlCount
                  })`,
                  body: <NonYamlPipeLineBuilds queryPeriodDays={queryPeriodDays} />,
                }
            : undefined
        }
      />
      <ProjectStat
        topStats={[
          {
            title: 'Central template usage',
            tooltip:
              isDefined(summaries.centralTemplatePipeline) &&
              isDefined(summaries.pipelines) &&
              isDefined(summaries.centralTemplateUsage) &&
              isDefined(summaries.totalBuilds)
                ? `${num(summaries.centralTemplatePipeline.central)} out of ${num(
                    summaries.pipelines.totalCount
                  )} build pipelines use the central template on the master branch<br>
                  ${num(summaries.centralTemplateUsage.templateUsers)} out of ${num(
                    summaries.totalBuilds.count
                  )} build runs used the central template`
                : undefined,
            value:
              isDefined(summaries.centralTemplatePipeline) &&
              isDefined(summaries.pipelines)
                ? divide(
                    summaries.centralTemplatePipeline.central,
                    summaries.pipelines.totalCount
                  )
                    .map(toPercentage)
                    .getOr('-')
                : '...',
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Conforms to branch policies',
            tooltip: summaries.branchPolicies
              ? `${num(summaries.branchPolicies.conformingBranches)} out of ${num(
                  summaries.branchPolicies.totalBranches
                )} release branches conform to branch policies<br />
              ${num(summaries.branchPolicies.conformingRepos)} out of ${num(
                  summaries.branchPolicies.repoCount
                )} repositories produced artifacts from branches`
              : undefined,
            value: summaries.branchPolicies
              ? divide(
                  summaries.branchPolicies.conformingBranches,
                  summaries.branchPolicies.totalBranches
                )
                  .map(toPercentage)
                  .getOr('-')
              : '-',
          },
        ]}
      />
    </ProjectStats>
  );
};
export default StreamingRepoSummary;
