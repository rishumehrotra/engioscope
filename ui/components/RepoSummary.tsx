import { last, multiply } from 'rambda';
import React from 'react';

import { divide, exists, toPercentage } from '../../shared/utils.js';
import { num, pluralise } from '../helpers/utils.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import { LabelWithSparkline } from './graphs/Sparkline.js';
import ProjectStat from './ProjectStat.js';
import ProjectStats from './ProjectStats.js';
import { decreaseIsBetter, increaseIsBetter } from './summary-page/utils.js';
import { trpc } from '../helpers/trpc.js';
import { useQueryContext } from '../hooks/query-hooks.js';
import NonYamlPipeLineBuilds from './NonYamlPipelineBuilds.jsx';

type RepoSummaryProps = {
  queryPeriodDays: number;
};

const RepoSummary: React.FC<RepoSummaryProps> = ({ queryPeriodDays }) => {
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asString);
  const queryContext = useQueryContext();

  const summaries = trpc.repos.getSummaries.useQuery({
    queryContext,
    searchTerm: search || undefined,
    groupsIncluded: selectedGroupLabels ? selectedGroupLabels.split(',') : undefined,
  });

  if (!summaries.data) {
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
        summaries.data.totalRepos - summaries.data.totalActiveRepos === 0 ? undefined : (
          <>
            {'Excluded '}
            <b>{summaries.data.totalRepos - summaries.data.totalActiveRepos}</b>
            {' inactive repositories from analysis'}
          </>
        )
      }
    >
      <ProjectStat
        topStats={[
          {
            title: 'Sonar',
            value: (
              <LabelWithSparkline
                label={divide(
                  summaries.data.reposWithSonarQube,
                  summaries.data.totalActiveRepos
                )
                  .map(toPercentage)
                  .getOr('-')}
                data={summaries.data.weeklyReposWithSonarQubeCount.map(w => w.count)}
                lineColor={increaseIsBetter(
                  summaries.data.weeklyReposWithSonarQubeCount.map(w => w.count)
                )}
              />
            ),
            tooltip: `${summaries.data.reposWithSonarQube} of ${pluralise(
              summaries.data.totalActiveRepos,
              'repo has',
              'repos have'
            )} SonarQube configured`,
          },
        ]}
        childStats={[
          summaries.data.sonarProjects.passedProjects === 0
            ? null
            : {
                title: 'Ok',
                value: (
                  <LabelWithSparkline
                    label={divide(
                      summaries.data.sonarProjects.passedProjects,
                      summaries.data.sonarProjects.totalProjects
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={summaries.data.weeklySonarProjectsCount.map(
                      s => s.passedProjects
                    )}
                    lineColor={increaseIsBetter(
                      summaries.data.weeklySonarProjectsCount.map(s => s.passedProjects)
                    )}
                  />
                ),
                tooltip: `${summaries.data.sonarProjects.passedProjects} of ${pluralise(
                  summaries.data.sonarProjects.totalProjects,
                  'sonar project has',
                  'sonar projects have'
                )} 'pass' quality gate`,
              },
          summaries.data.sonarProjects.projectsWithWarning === 0
            ? null
            : {
                title: 'Warn',
                value: (
                  <LabelWithSparkline
                    label={divide(
                      summaries.data.sonarProjects.projectsWithWarning,
                      summaries.data.sonarProjects.totalProjects
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={summaries.data.weeklySonarProjectsCount.map(
                      s => s.projectsWithWarnings
                    )}
                    lineColor={increaseIsBetter(
                      summaries.data.weeklySonarProjectsCount.map(
                        s => s.projectsWithWarnings
                      )
                    )}
                  />
                ),
                tooltip: `${summaries.data.sonarProjects.projectsWithWarning} of ${summaries.data.sonarProjects.totalProjects} sonar projects have 'warn' quality gate`,
              },
          summaries.data.sonarProjects.failedProjects === 0
            ? null
            : {
                title: 'Fail',
                value: (
                  <LabelWithSparkline
                    label={divide(
                      summaries.data.sonarProjects.failedProjects,
                      summaries.data.sonarProjects.totalProjects
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={summaries.data.weeklySonarProjectsCount.map(
                      s => s.failedProjects
                    )}
                    lineColor={decreaseIsBetter(
                      summaries.data.weeklySonarProjectsCount.map(s => s.failedProjects)
                    )}
                  />
                ),
                tooltip: `${summaries.data.sonarProjects.failedProjects} of ${pluralise(
                  summaries.data.sonarProjects.totalProjects,
                  'sonar project has',
                  'sonar projects have'
                )} 'fail' quality gate`,
              },
        ].filter(exists)}
      />

      <ProjectStat
        topStats={[
          {
            title: 'Tests',
            value: (
              <LabelWithSparkline
                label={num(last(summaries.data.weeklyTestsSummary)?.totalTests || 0)}
                data={summaries.data.weeklyTestsSummary.map(t => t.totalTests)}
                lineColor={increaseIsBetter(
                  summaries.data.weeklyTestsSummary.map(t => t.totalTests)
                )}
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
                label={divide(
                  last(summaries.data.weeklyCoverageSummary)?.coveredBranches || 0,
                  last(summaries.data.weeklyCoverageSummary)?.totalBranches || 0
                )
                  .map(toPercentage)
                  .getOr('-')}
                data={summaries.data.weeklyCoverageSummary.map(week => {
                  return divide(week.coveredBranches, week.totalBranches)
                    .map(multiply(100))
                    .getOr(0);
                })}
                lineColor={increaseIsBetter(
                  summaries.data.weeklyCoverageSummary.map(week => {
                    return divide(week.coveredBranches || 0, week.totalBranches || 0)
                      .map(multiply(100))
                      .getOr(0);
                  })
                )}
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
            value: divide(
              summaries.data.defSummary.defsWithTests,
              summaries.data.defSummary.totalDefs
            )
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(summaries.data.defSummary.defsWithTests)} of ${num(
              summaries.data.defSummary.totalDefs
            )} pipelines report test results`,
          },
        ]}
        childStats={[
          {
            title: 'Reporting coverage',
            value: divide(
              summaries.data.defSummary.defsWithCoverage,
              summaries.data.defSummary.totalDefs
            )
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(summaries.data.defSummary.defsWithCoverage)} of ${num(
              summaries.data.defSummary.totalDefs
            )} pipelines report branch coverage`,
          },
        ]}
      />
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
                label={divide(
                  summaries.data.successfulBuilds.count,
                  summaries.data.totalBuilds.count
                )
                  .map(toPercentage)
                  .getOr('-')}
                data={summaries.data.totalBuilds.byWeek.map(build => {
                  const successfulBuildsForWeek =
                    summaries.data.successfulBuilds.byWeek.find(
                      s => s.weekIndex === build.weekIndex
                    );
                  return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                    .map(multiply(100))
                    .getOr(0);
                })}
                lineColor={increaseIsBetter(
                  summaries.data.totalBuilds.byWeek.map(build => {
                    const successfulBuildsForWeek =
                      summaries.data.successfulBuilds.byWeek.find(
                        s => s.weekIndex === build.weekIndex
                      );
                    return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                      .map(multiply(100))
                      .getOr(0);
                  })
                )}
                yAxisLabel={x => `${x}%`}
              />
            ),
            tooltip: `${num(summaries.data.successfulBuilds.count)} out of ${num(
              summaries.data.totalBuilds.count
            )} builds have succeeded`,
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Healthy branches',
            tooltip: `${num(summaries.data.healthyBranches.healthy)} out of ${num(
              summaries.data.healthyBranches.total
            )} branches are healthy`,
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
              summaries.data.pipelines.yamlCount,
              summaries.data.pipelines.totalCount
            )
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(summaries.data.pipelines.yamlCount)} of ${num(
              summaries.data.pipelines.totalCount
            )} pipelines are set up using a YAML-based configuration`,
          },
        ]}
        onClick={
          summaries.data.pipelines.totalCount === summaries.data.pipelines.yamlCount
            ? undefined
            : {
                open: 'modal',
                heading: 'Pipelines not using YAML-based configuration',
                subheading: `(${
                  summaries.data.pipelines.totalCount - summaries.data.pipelines.yamlCount
                })`,
                body: <NonYamlPipeLineBuilds queryPeriodDays={queryPeriodDays} />,
              }
        }
      />
      <ProjectStat
        topStats={[
          {
            title: 'Central template usage',
            tooltip: `${num(summaries.data.centralTemplatePipeline.central)} out of ${num(
              summaries.data.pipelines.totalCount
            )} build pipelines use the central template on the master branch<br>
            ${num(summaries.data.activePipelineWithCentralTemplateCount)} out of ${num(
              summaries.data.activePipelinesCount
            )} active build pipelines use the central template on the master branch<br>
                  ${num(summaries.data.centralTemplateUsage.templateUsers)} out of ${num(
              summaries.data.totalBuilds.count
            )} build runs used the central template<br>
            ${num(summaries.data.activePipelineCentralTemplateBuilds.count)} out of ${num(
              summaries.data.activePipelineBuilds
            )} build runs from active pipeline used the central template`,
            value: divide(
              summaries.data.centralTemplatePipeline.central,
              summaries.data.pipelines.totalCount
            )
              .map(toPercentage)
              .getOr('-'),
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Conforms to branch policies',
            tooltip: summaries.data.branchPolicies
              ? `${num(summaries.data.branchPolicies.conformingBranches)} out of ${num(
                  summaries.data.branchPolicies.totalBranches
                )} release branches conform to branch policies<br />
              ${num(summaries.data.branchPolicies.conformingRepos)} out of ${num(
                  summaries.data.branchPolicies.repoCount
                )} repositories produced artifacts from branches`
              : undefined,
            value: summaries.data.branchPolicies
              ? divide(
                  summaries.data.branchPolicies.conformingBranches,
                  summaries.data.branchPolicies.totalBranches
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
export default RepoSummary;
