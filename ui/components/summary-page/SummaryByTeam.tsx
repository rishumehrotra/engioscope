import { prop } from 'rambda';
import React, {
  Fragment, useRef, useState
} from 'react';
import { maybe } from '../../../shared/maybe';
import { asc, byString } from '../../../shared/sort-utils';
import type { SummaryMetrics } from '../../../shared/types';
import { divide, toPercentage } from '../../../shared/utils';
import { num, prettyMS } from '../../helpers/utils';
import { LabelWithSparkline } from '../graphs/Sparkline';
import UsageByEnv from '../UsageByEnv';
import type { SummaryGroupKey, SummaryItemProps } from './utils';
import {
  flowEfficiency, decreaseIsBetter, increaseIsBetter,
  getMetricCategoryDefinitionId, flattenSummaryGroups, allExceptExpectedKeys,
  renderGroupItem, processSummary
} from './utils';

type CardProps = {
  title: React.ReactNode;
  type: 'small' | 'large';
  comingSoon?: boolean;
  children?: React.ReactNode;
  width?: 1 | 2;
};

const Card: React.FC<CardProps> = ({
  title, children, type, comingSoon = false, width = 1
}) => (
  <div
    className={`p-6 h-full bg-white rounded-lg shadow ${
      type === 'large' ? 'mt-4' : ''
    } ${comingSoon ? 'opacity-50' : ''} ${width === 2 ? 'col-span-2' : ''}`}
  >
    <h2 className={`${type === 'large' ? 'text-xl' : 'text-lg'} mb-5 font-semibold flex items-center`}>
      {title}
      {comingSoon && (
        <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">coming soon</span>
      )}
    </h2>
    {children}
  </div>
);

const FlowMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ group, workItemTypes }) => {
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
  const projectLink = `/${group.collection}/${group.project}/${filterQS}`;
  const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

  return (
    <Card title="Flow Metrics" type="large">
      <table className="w-full">
        <thead>
          <tr>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th className="w-1/12" />
            <th
              className="text-xs font-semibold py-3 w-1/12"
              data-tip="Number of new work items added in the last 90 days"
            >
              New
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Number of work items completed in the last 90 days"
            >
              Velocity
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Average time taken to complete a work item over the last 90 days"
            >
              Cycle time
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Average time taken to take a work item to production after development is complete"
            >
              CLT
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Fraction of overall time that work items spend in work centers on average"
            >
              Flow efficiency
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Increase in the number of WIP items over the last 90 days"
            >
              WIP increase
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Average age of work items in progress"
            >
              WIP age
            </th>
          </tr>
        </thead>
        <tbody>
          {['Feature', 'User Story'].map(typeName => {
            const definitionId = getMetricCategoryDefinitionId(workItemTypes, typeName);
            if (!definitionId) return null;

            const workItems = group.summary[definitionId];
            const workItemsSummary = flattenSummaryGroups(workItems || {});
            const renderMetric = renderGroupItem(typeName === 'Feature' ? portfolioProjectLink : projectLink);

            return (
              <tr key={typeName}>
                <td className="font-semibold text-sm flex items-center py-3">
                  <img
                    src={workItemTypes[definitionId].icon}
                    alt="Features"
                    className="w-4 h-4 mr-2"
                  />
                  <span>{workItemTypes[definitionId].name[1]}</span>
                </td>
                <td className="font-semibold text-xl">
                  {renderMetric(
                    <LabelWithSparkline
                      label={num(workItemsSummary.leakage)}
                      data={workItemsSummary.leakageByWeek}
                      lineColor={increaseIsBetter(workItemsSummary.leakageByWeek)}
                    />,
                    '#new-work-items'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderMetric(
                    <LabelWithSparkline
                      label={num(workItemsSummary.velocity)}
                      data={workItemsSummary.velocityByWeek}
                      lineColor={increaseIsBetter(workItemsSummary.velocityByWeek)}
                    />,
                    '#velocity'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderMetric(
                    <LabelWithSparkline
                      label={workItemsSummary.cycleTime
                        ? prettyMS(workItemsSummary.cycleTime)
                        : '-'}
                      data={workItemsSummary.cycleTimeByWeek}
                      lineColor={decreaseIsBetter(workItemsSummary.cycleTimeByWeek)}
                      yAxisLabel={prettyMS}
                    />,
                    '#cycle-time'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderMetric(
                    <LabelWithSparkline
                      label={workItemsSummary.changeLeadTime
                        ? prettyMS(workItemsSummary.changeLeadTime)
                        : '-'}
                      data={workItemsSummary.changeLeadTimeByWeek}
                      lineColor={decreaseIsBetter(workItemsSummary.changeLeadTimeByWeek)}
                      yAxisLabel={prettyMS}
                    />,
                    '#change-lead-time'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderMetric(
                    <LabelWithSparkline
                      label={workItemsSummary.flowEfficiency
                        ? `${Math.round(flowEfficiency(workItemsSummary.flowEfficiency))}%`
                        : '-'}
                      data={workItemsSummary.flowEfficiencyByWeek.map(flowEfficiency)}
                      lineColor={increaseIsBetter(workItemsSummary.flowEfficiencyByWeek.map(flowEfficiency))}
                      yAxisLabel={value => `${value}%`}
                    />,
                    '#flow-efficiency'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderMetric(
                    <LabelWithSparkline
                      label={(
                        <>
                          {workItemsSummary.wipIncrease}
                          <span className="text-lg text-gray-500 inline-block ml-2">
                            <span className="font-normal text-sm">of</span>
                            {' '}
                            {workItemsSummary.wipCount}
                          </span>
                        </>
                      )}
                      data={workItemsSummary.wipIncreaseByWeek}
                      lineColor={decreaseIsBetter(workItemsSummary.wipIncreaseByWeek)}
                    />,
                    '#work-in-progress-trend'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderMetric(
                    workItemsSummary.wipAge
                      ? prettyMS(workItemsSummary.wipAge)
                      : '-',
                    '#age-of-work-in-progress-items'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const QualityMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ group, workItemTypes }) => {
  const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
  const bugs = bugsDefinitionId ? group.summary[bugsDefinitionId] : null;
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
  const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;
  const renderBugMetric = renderGroupItem(portfolioProjectLink);
  const envs = group.environments?.map(e => e.toLowerCase());

  if (!bugs) return null;

  return (
    <Card type="large" title="Quality metrics">
      <table className="w-full">
        <thead>
          <tr>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th className="w-1/12" />
            <th
              className="text-xs font-semibold py-3 w-1/12"
              data-tip="Number of bugs opened in the last 90 days"
            >
              New
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Number of bugs closed in the last 90 days"
            >
              Fixed
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Average time taken to close a bug"
            >
              Cycle time
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Average time taken to close a bug once development is complete"
            >
              CLT
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Fraction of overall time that work items spend in work centers on average"
            >
              Flow efficiency
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Number of work-in-progress bugs"
            >
              WIP increase
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Average age of work-in-progress bugs"
            >
              WIP age
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(bugs)
            .sort(([a], [b]) => {
              if (!envs) return 0;
              return envs.indexOf(a.toLowerCase()) - envs.indexOf(b.toLowerCase());
            })
            .map(([environment, envBasedBugInfo]) => {
              const bugInfo = processSummary(envBasedBugInfo);

              return (
                <tr key={environment}>
                  <td className="font-semibold text-sm flex items-center py-3">
                    { bugsDefinitionId ? (
                      <img
                        src={workItemTypes[bugsDefinitionId].icon}
                        alt="Features"
                        className="w-4 h-4 mr-2"
                      />
                    )
                      : null}
                    {environment}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      <LabelWithSparkline
                        label={bugInfo.leakage}
                        data={bugInfo.leakageByWeek}
                        lineColor={decreaseIsBetter(bugInfo.leakageByWeek)}
                      />,
                      '#bug-leakage-with-root-cause'
                    )}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      <LabelWithSparkline
                        label={bugInfo.velocity}
                        data={bugInfo.velocityByWeek}
                        lineColor={increaseIsBetter(bugInfo.velocityByWeek)}
                      />,
                      '#velocity'
                    )}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      <LabelWithSparkline
                        label={maybe(bugInfo.cycleTime)
                          .map(prettyMS)
                          .getOr('-')}
                        data={bugInfo.cycleTimeByWeek}
                        lineColor={decreaseIsBetter(bugInfo.cycleTimeByWeek)}
                        yAxisLabel={prettyMS}
                      />,
                      '#cycle-time'
                    )}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      <LabelWithSparkline
                        label={maybe(bugInfo.changeLeadTime)
                          .map(prettyMS)
                          .getOr('-')}
                        data={bugInfo.changeLeadTimeByWeek}
                        lineColor={decreaseIsBetter(bugInfo.changeLeadTimeByWeek)}
                        yAxisLabel={prettyMS}
                      />,
                      '#change-lead-time'
                    )}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      <LabelWithSparkline
                        label={maybe(bugInfo.flowEfficiency)
                          .map(x => `${Math.round(flowEfficiency(x))}%`)
                          .getOr('-')}
                        data={bugInfo.flowEfficiencyByWeek.map(flowEfficiency)}
                        lineColor={increaseIsBetter(bugInfo.flowEfficiencyByWeek.map(flowEfficiency))}
                        yAxisLabel={x => `${x}%`}
                      />,
                      '#flow-efficiency'
                    )}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      <LabelWithSparkline
                        label={(
                          <>
                            {bugInfo.wipIncrease}
                            <span className="text-lg text-gray-500 inline-block ml-2">
                              <span className="font-normal text-sm">of</span>
                              {' '}
                              {bugInfo.wipCount}
                            </span>
                          </>
                        )}
                        data={bugInfo.wipIncreaseByWeek}
                        lineColor={decreaseIsBetter(bugInfo.wipIncreaseByWeek)}
                      />,
                      '#work-in-progress-trend'
                    )}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      maybe(bugInfo.wipAge)
                        .map(prettyMS)
                        .getOr('-'),
                      '#age-of-work-in-progress-items'
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </Card>
  );
};

const HealthMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
}> = ({ group }) => {
  const { repoStats, pipelineStats } = group;
  const { codeQuality } = repoStats;
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
  const baseProjectLink = `/${group.collection}/${group.project}`;
  const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
  const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

  return (
    <>
      <div className="grid grid-cols-2 justify-between">
        <h2 className="text-xs uppercase mt-8 ml-1 font-semibold">
          Health metrics
        </h2>
        <p className="justify-self-end mt-8 mr-1 text-xs">
          {'Analysed '}
          <b>{repoStats.repos}</b>
          {repoStats.repos === 1 ? ' repo' : ' repos'}
          {repoStats.excluded
            ? (
              <>
                {', excluded '}
                <b>{repoStats.excluded}</b>
                {repoStats.excluded === 1 ? ' repo' : ' repos'}
              </>
            )
            : null}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        <Card title="Test automation" type="small">
          <div className="grid grid-cols-2 gap-4">
            <div
              className="text-xs font-semibold mb-2"
              data-tip="Number of unit / components tests running in build pipelines"
            >
              Tests
              <div className="font-semibold text-xl">
                {reposMetric(
                  <LabelWithSparkline
                    label={num(repoStats.tests)}
                    data={repoStats.testsByWeek}
                    lineColor={increaseIsBetter(repoStats.testsByWeek)}
                  />
                )}
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold mb-2"
                data-tip="Percentage of code covered by tests"
              >
                Coverage
                <div className="text-lg">
                  {reposMetric(repoStats.coverage)}
                </div>
              </div>
            </div>
            {
              pipelineStats.stages.map(stage => (
                <Fragment key={stage.name}>
                  <div
                    className="text-xs font-semibold"
                    data-tip={`Percentage of pipelines having ${stage.name}`}
                  >
                    {`Pipelines having ${stage.name}`}
                    <div className="font-semibold text-xl">
                      {pipelinesMetric(
                        divide(stage.exists, pipelineStats.pipelines)
                          .map(toPercentage)
                          .getOr('-')
                      )}
                    </div>
                  </div>
                  <div
                    className="text-xs font-semibold"
                    data-tip={`Percentage of pipelines using ${stage.name}`}
                  >
                    {`Pipelines using ${stage.name}`}
                    <div className="font-semibold text-xl">
                      {pipelinesMetric(
                        divide(stage.used, pipelineStats.pipelines)
                          .map(toPercentage)
                          .getOr('-')
                      )}
                    </div>
                  </div>
                </Fragment>
              ))
            }
          </div>
        </Card>

        <Card title="Code quality" type="small">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 grid grid-flow-row gap-4 bg-slate-100 rounded-lg p-3 pl-3 -ml-3 -mt-3 -mb-3">
              <div>
                <div
                  className="text-xs font-semibold"
                  data-tip="Percentage of repos with Sonar configured"
                >
                  Sonar enabled
                </div>
                <div
                  className="font-semibold text-xl mb-2"
                  data-tip={`${codeQuality.configured} of ${repoStats.repos} repos have SonarQube configured`}
                >
                  {repoStats.repos
                    ? (
                      <>
                        {reposMetric(
                          <LabelWithSparkline
                            label={divide(codeQuality.configured, repoStats.repos)
                              .map(toPercentage)
                              .getOr('-')}
                            data={repoStats.newSonarSetupsByWeek}
                            lineColor={increaseIsBetter(repoStats.newSonarSetupsByWeek)}
                          />
                        )}
                      </>
                    )
                    : '-'}
                </div>
              </div>

              <div className="grid grid-cols-3">
                <div>
                  <div
                    className="text-xs font-semibold"
                    data-tip="Percentage of pipelines with sonar configured that pass quality checks"
                  >
                    Ok
                  </div>
                  <div
                    className="font-semibold text-md"
                    data-tip={`${codeQuality.pass} of ${codeQuality.sonarProjects} sonar projects have 'pass' quality gate`}
                  >
                    {codeQuality.sonarProjects
                      ? (
                        <LabelWithSparkline
                          label={`${Math.round((codeQuality.pass / codeQuality.sonarProjects) * 100)}%`}
                          data={repoStats.sonarCountsByWeek.pass}
                          lineColor={increaseIsBetter(repoStats.sonarCountsByWeek.pass)}
                        />
                      )
                      : '-'}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xs font-semibold"
                    data-tip="Percentage of pipelines with sonar configured that have a warning for quality checks"
                  >
                    Warn
                  </div>
                  <div
                    className="font-semibold text-md"
                    data-tip={`${codeQuality.warn} of ${codeQuality.sonarProjects} sonar projects have 'warn' quality gate`}
                  >
                    {codeQuality.sonarProjects
                      ? (
                        <LabelWithSparkline
                          label={`${Math.round((codeQuality.warn / codeQuality.sonarProjects) * 100)}%`}
                          data={repoStats.sonarCountsByWeek.warn}
                          lineColor={decreaseIsBetter(repoStats.sonarCountsByWeek.warn)}
                        />
                      )
                      : '-'}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xs font-semibold"
                    data-tip="Percentage of pipelines with sonar configured that fail quality checks"
                  >
                    Fail
                  </div>
                  <div
                    className="font-semibold text-md"
                    data-tip={`${codeQuality.fail} of ${codeQuality.sonarProjects} sonar projects have 'fail' quality gate`}
                  >
                    {codeQuality.sonarProjects
                      ? (
                        <LabelWithSparkline
                          label={`${Math.round((codeQuality.fail / codeQuality.sonarProjects) * 100)}%`}
                          data={repoStats.sonarCountsByWeek.fail}
                          lineColor={decreaseIsBetter(repoStats.sonarCountsByWeek.fail)}
                        />
                      )
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of pipelines conforming to branch policies"
              >
                Branch policy met
              </div>
              <div className="font-semibold text-xl">
                {pipelinesMetric(
                  divide(pipelineStats.conformsToBranchPolicies, pipelineStats.pipelines)
                    .map(toPercentage)
                    .getOr('-')
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card title="CI builds" type="small">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Number of CI builds run in the last 90 days"
              >
                Runs
                <div className="font-semibold text-xl mb-2">
                  {reposMetric(num(repoStats.builds.total))}
                </div>
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of successful builds"
              >
                Success
              </div>
              <div className="font-semibold text-lg">
                {divide(repoStats.builds.successful, repoStats.builds.total)
                  .map(toPercentage)
                  .getOr('-')}
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Number of pipelines configured using a YAML file"
              >
                YAML pipelines
              </div>
              <div className="text-xl font-semibold">
                {reposMetric(
                  divide(repoStats.ymlPipelines.count, repoStats.ymlPipelines.total)
                    .map(toPercentage)
                    .getOr('-')
                )}
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Average time taken to fix a build failure"
              >
                MTTR build failure
              </div>
              <div className="text-xs pt-2 uppercase font-light">
                Coming soon
              </div>
            </div>
          </div>
        </Card>

        <Card title="Releases" type="small" width={2}>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div
                  className="text-xs font-semibold"
                  data-tip="Number of release pipelines that only release from the master branch"
                >
                  Master only pipelines
                </div>
                <div className="font-semibold text-xl">
                  {pipelinesMetric(
                    divide(pipelineStats.masterOnlyPipelines.count, pipelineStats.masterOnlyPipelines.total)
                      .map(toPercentage)
                      .getOr('-')
                  )}
                </div>
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  data-tip="Number of release pipelines that have a starting artifact"
                >
                  Starts with artifact
                </div>
                <div className="font-semibold text-xl">
                  {pipelinesMetric(
                    divide(pipelineStats.startsWithArtifact, pipelineStats.pipelines)
                      .map(toPercentage)
                      .getOr('-')
                  )}
                </div>
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  data-tip="Number of repos that have associated release pipelines"
                >
                  Repos with release pipelines
                </div>
                <div className="font-semibold text-xl">
                  {reposMetric(
                    divide(repoStats.hasPipelines, repoStats.repos)
                      .map(toPercentage)
                      .getOr('-')
                  )}
                </div>
              </div>
            </div>
            <div className="-mt-9">
              <UsageByEnv
                perEnvUsage={pipelineStats.usageByEnvironment}
                pipelineCount={pipelineStats.pipelines}
              />
            </div>
          </div>
        </Card>

        <Card title="Contract driven development" type="small" comingSoon>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Number of contracts tests"
              >
                Contract Tests
              </div>
              <div className="font-semibold text-xl">xx</div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Number of contract tests used for service virtualisation"
              >
                Contracts used as stubs
              </div>
              <div className="font-semibold text-xl">xx</div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Number of unused contract tests"
              >
                Orphaned contracts
              </div>
              <div className="font-semibold text-xl">xx</div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of APIs covered by contract tests"
              >
                Coverage
              </div>
              <div className="font-semibold text-xl">xx%</div>
            </div>
          </div>
        </Card>

        <Card title="Infrastructure" type="small" comingSoon>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Total planned downtime (in mins) due to deployments"
              >
                Deployment Downtime
              </div>
              <div className="font-semibold text-xl">
                xx
                {' '}
                <span className="text-sm">mins</span>
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of pipelines where EAT infrastructure is provisioned on-demand via Azure Pipelines"
              >
                Ephemeral EAT
              </div>
              <div className="font-semibold text-xl">xx%</div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of components that are containerized"
              >
                Containers
              </div>
              <div className="font-semibold text-xl">xx%</div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of release pipelines deploying EAT artifact to public cloud"
              >
                Infra on public cloud
              </div>
              <div className="font-semibold text-xl">xx%</div>
            </div>
          </div>
        </Card>

        <Card title="Feature toggles" type="small" comingSoon>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Number of independent deployments enabled by feature toggles"
              >
                Independent deployments
              </div>
              <div className="font-semibold text-xl">xx</div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Average age of a feature toggle once toggled on"
              >
                Toggled ON (Avg. age)
              </div>
              <div className="font-semibold text-xl">
                xx
                {' '}
                <span className="text-sm">days</span>
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Average age that a feature toggle has been toggled off"
              >
                Toggled OFF (Avg. age)
              </div>
              <div className="font-semibold text-xl">
                xx
                {' '}
                <span className="text-sm">days</span>
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tip="Number of bugs raised where the RCA is due to feature toggles"
              >
                Bugs due to toggles
              </div>
              <div className="font-semibold text-xl">xx</div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

const SummaryItem: React.FC<SummaryItemProps> = ({ group, workItemTypes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const summaryRef = useRef<HTMLElement>(null);

  return (
    <details>
      <summary
        className="text-2xl font-bold group cursor-pointer"
        id={`${group.groupName}`}
        ref={summaryRef}
        onClick={evt => {
          if (summaryRef.current?.contains(evt.currentTarget)) {
            setIsOpen(!isOpen);
          }
        }}
      >
        <span>{group.groupName}</span>
        {/* <span className="opacity-0 ml-2 group-hover:opacity-20">#</span> */}
      </summary>

      {isOpen && (
        <>
          <h2 className="text-xs uppercase mt-8 ml-1 font-semibold">
            Value metrics
          </h2>
          <FlowMetrics group={group} workItemTypes={workItemTypes} />
          <QualityMetrics group={group} workItemTypes={workItemTypes} />
          <HealthMetrics group={group} />
        </>
      )}
    </details>
  );
};

const SummaryByTeam: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ groups, workItemTypes }) => (
  <ul className="bg-gray-50 p-8 rounded-lg">
    {groups
      .sort(asc(byString(prop('groupName'))))
      .map(group => (
        <li key={group.groupName} className="mb-8">
          <SummaryItem
            group={group}
            workItemTypes={workItemTypes}
          />
        </li>
      ))}
  </ul>
);

export default SummaryByTeam;
