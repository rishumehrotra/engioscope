import { last, multiply } from 'rambda';
import React, { useMemo } from 'react';
import { divide, toPercentage } from '../../shared/utils.js';
import { num, pluralise } from '../helpers/utils.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import { useQueryContext } from '../hooks/query-hooks.js';
import useSse from '../hooks/use-merge-over-sse.js';
import type { SummaryStats } from '../../backend/models/repo-listing.js';
import { Stat, SummaryCard, decreaseIsBetter, increaseIsBetter } from './SummaryCard.jsx';

type RepoSummaryProps = {
  queryPeriodDays: number;
};

const isDefined = <T,>(val: T | undefined): val is T => val !== undefined;

const StreamingRepoSummary: React.FC<RepoSummaryProps> = ({ queryPeriodDays }) => {
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asString);
  const queryContext = useQueryContext();

  const sseUrl = useMemo(() => {
    return `/api/${queryContext[0]}/${
      queryContext[1]
    }/repos/summary?${new URLSearchParams({
      startDate: queryContext[2].toISOString(),
      endDate: queryContext[3].toISOString(),
      ...(search ? { search } : {}),
      ...(selectedGroupLabels ? { groupsIncluded: selectedGroupLabels } : {}),
    }).toString()}`;
  }, [queryContext, search, selectedGroupLabels]);

  const summaries = useSse<SummaryStats>(sseUrl);

  return (
    <>
      <div className="mb-8 grid grid-cols-4 gap-6">
        <SummaryCard className="col-span-2 grid grid-cols-2 gap-6">
          <div className="row-span-2 border-r border-gray-200 pr-6">
            <Stat
              title="Sonar"
              tooltip={
                isDefined(summaries.reposWithSonarQube) &&
                isDefined(summaries.totalActiveRepos)
                  ? `${summaries.reposWithSonarQube} of ${pluralise(
                      summaries.totalActiveRepos,
                      'repo has',
                      'repos have'
                    )} SonarQube configured`
                  : null
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
              graph={
                isDefined(summaries.weeklyReposWithSonarQubeCount)
                  ? summaries.weeklyReposWithSonarQubeCount.map(w => w.count)
                  : []
              }
              graphColor={
                isDefined(summaries.weeklyReposWithSonarQubeCount)
                  ? increaseIsBetter(
                      summaries.weeklyReposWithSonarQubeCount.map(w => w.count)
                    )
                  : null
              }
            />
          </div>
          <div>
            <Stat
              title="Ok"
              tooltip={
                isDefined(summaries.sonarProjects)
                  ? `${summaries.sonarProjects.passedProjects} of ${pluralise(
                      summaries.sonarProjects.totalProjects,
                      'sonar project has',
                      'sonar projects have'
                    )} 'pass' quality gate`
                  : null
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
              graph={
                isDefined(summaries.weeklySonarProjectsCount)
                  ? summaries.weeklySonarProjectsCount.map(s => s.passedProjects)
                  : null
              }
              graphColor={
                isDefined(summaries.weeklySonarProjectsCount)
                  ? increaseIsBetter(
                      summaries.weeklySonarProjectsCount.map(s => s.passedProjects)
                    )
                  : null
              }
            />
          </div>
          <div>
            <Stat
              title="Fail"
              tooltip={
                isDefined(summaries.sonarProjects)
                  ? `${summaries.sonarProjects.failedProjects} of ${pluralise(
                      summaries.sonarProjects.totalProjects,
                      'sonar project has',
                      'sonar projects have'
                    )} 'fail' quality gate`
                  : null
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
              graph={summaries.weeklySonarProjectsCount?.map(s => s.failedProjects) || []}
              graphColor={decreaseIsBetter(
                summaries.weeklySonarProjectsCount?.map(s => s.failedProjects) || []
              )}
            />
          </div>
        </SummaryCard>

        <SummaryCard>
          <Stat
            title="Tests"
            tooltip="Total number of tests across all matching repos."
            value={
              isDefined(summaries.weeklyTestsSummary)
                ? num(last(summaries.weeklyTestsSummary)?.totalTests || 0)
                : null
            }
            graphPosition="bottom"
            graph={
              isDefined(summaries.weeklyTestsSummary)
                ? summaries.weeklyTestsSummary.map(t => t.totalTests)
                : null
            }
            graphColor={
              isDefined(summaries.weeklyTestsSummary)
                ? increaseIsBetter(summaries.weeklyTestsSummary.map(t => t.totalTests))
                : null
            }
          />
        </SummaryCard>

        <SummaryCard>
          <Stat
            title="Coverage"
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
            graph={
              isDefined(summaries.weeklyCoverageSummary)
                ? summaries.weeklyCoverageSummary.map(week => {
                    return divide(week.coveredBranches, week.totalBranches)
                      .map(multiply(100))
                      .getOr(0);
                  })
                : null
            }
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
          />
        </SummaryCard>

        <SummaryCard className="col-span-4 grid grid-cols-5 gap-6">
          <div className="border-r border-gray-200">
            <Stat
              title="Branch policies"
              tooltip={
                summaries.branchPolicies
                  ? `${num(summaries.branchPolicies.conformingBranches)} out of ${num(
                      summaries.branchPolicies.totalBranches
                    )} release branches conform to branch policies<br />
                  ${num(summaries.branchPolicies.conformingRepos)} out of ${num(
                      summaries.branchPolicies.repoCount
                    )} repositories produced artifacts from branches<br />that conform to branch policies`
                  : null
              }
              value={
                summaries.branchPolicies
                  ? divide(
                      summaries.branchPolicies.conformingBranches,
                      summaries.branchPolicies.totalBranches
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
            />
          </div>
          <div className="border-r border-gray-200">
            <Stat
              title="Healthy branches"
              tooltip={
                isDefined(summaries.healthyBranches)
                  ? `${num(summaries.healthyBranches.healthy)} out of ${num(
                      summaries.healthyBranches.total
                    )} branches are healthy`
                  : null
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
          <div className="border-r border-gray-200">
            <Stat
              title="Has releases"
              tooltip={
                isDefined(summaries.hasReleasesReposCount) &&
                isDefined(summaries.totalActiveRepos)
                  ? `${num(summaries.hasReleasesReposCount)} out of ${num(
                      summaries.totalActiveRepos
                    )} repos have made releases in the last ${queryPeriodDays} days`
                  : null
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
          <div className="border-r border-gray-200">
            <Stat
              title="YAML pipelines"
              tooltip={
                isDefined(summaries.pipelines)
                  ? `${num(summaries.pipelines.yamlCount)} of ${num(
                      summaries.pipelines.totalCount
                    )} pipelines are set up using a YAML-based configuration`
                  : null
              }
              value={
                isDefined(summaries.pipelines)
                  ? divide(summaries.pipelines.yamlCount, summaries.pipelines.totalCount)
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
            />
          </div>
          <div className="border-r border-gray-200">
            <Stat
              title="Central template"
              tooltip={
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
            />
          </div>
        </SummaryCard>
        <SummaryCard className="col-span-2 grid grid-cols-2 gap-6">
          <div className="border-r border-gray-200 pr-6">
            <Stat
              title="Builds"
              tooltip="Total number of builds across all matching repos"
              value={
                isDefined(summaries.totalBuilds) ? num(summaries.totalBuilds.count) : null
              }
              graphPosition="right"
              graphColor={
                isDefined(summaries.totalBuilds)
                  ? increaseIsBetter(summaries.totalBuilds.byWeek.map(week => week.count))
                  : null
              }
              graph={
                isDefined(summaries.totalBuilds)
                  ? summaries.totalBuilds.byWeek.map(week => week.count)
                  : null
              }
            />
          </div>
          <div>
            <Stat
              title="Success"
              tooltip={
                isDefined(summaries.successfulBuilds) && isDefined(summaries.totalBuilds)
                  ? `${num(summaries.successfulBuilds.count)} out of ${num(
                      summaries.totalBuilds.count
                    )} builds have succeeded`
                  : undefined
              }
              value={
                isDefined(summaries.successfulBuilds) && isDefined(summaries.totalBuilds)
                  ? divide(summaries.successfulBuilds.count, summaries.totalBuilds.count)
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
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
              graph={
                isDefined(summaries.totalBuilds)
                  ? summaries.totalBuilds.byWeek.map(build => {
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
                  : null
              }
            />
          </div>
        </SummaryCard>
        <SummaryCard className="col-span-2 grid grid-cols-2 gap-6">
          <div className="border-r border-gray-200">
            <Stat
              title="Pipelines running tests"
              tooltip={
                isDefined(summaries.defSummary)
                  ? `${num(summaries.defSummary.defsWithTests)} of ${num(
                      summaries.defSummary.totalDefs
                    )} pipelines report test results`
                  : null
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
            />
          </div>
          <div>
            <Stat
              title="Reporting coverage"
              tooltip={
                isDefined(summaries.defSummary)
                  ? `${num(summaries.defSummary.defsWithCoverage)} of ${num(
                      summaries.defSummary.totalDefs
                    )} pipelines report branch coverage`
                  : null
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
            />
          </div>
        </SummaryCard>
      </div>
      {isDefined(summaries.totalRepos) &&
      isDefined(summaries.totalActiveRepos) &&
      summaries.totalRepos === summaries.totalActiveRepos ? (
        <>
          {'Excluded '}
          <b>{summaries.totalRepos - summaries.totalActiveRepos}</b>
          {' inactive repositories from analysis'}
        </>
      ) : null}
    </>
  );
};
export default StreamingRepoSummary;
