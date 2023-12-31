import { prop } from 'rambda';
import React, { Fragment, useRef, useState } from 'react';
import { asc, byString } from 'sort-lib';
import { maybe } from '../../../shared/maybe.js';
import type { SummaryMetrics } from '../../../shared/types.js';
import { divide, exists, toPercentage } from '../../../shared/utils.js';
import { prettyMS } from '../../helpers/utils.js';
import ExtendedLabelWithSparkline from '../graphs/ExtendedLabelWithSparkline.js';
import { LabelWithSparkline } from '../graphs/Sparkline.js';
import { pathRendererSkippingUndefineds } from '../graphs/sparkline-renderers.js';
import {
  buildRunsSparkline,
  changeLeadTimeSparkline,
  coverageSparkline,
  cycleTimeSparkline,
  flowEfficiencySparkline,
  newBugsSparkline,
  newItemsSparkline,
  newSonarSetupsSparkline,
  testAutomationSparkline,
  velocitySparkline,
  wipTrendSparkline,
} from '../sparkline-props.js';
import UsageByEnv from '../UsageByEnv.js';
import type { SummaryGroupKey, SummaryItemProps } from './utils.js';
import {
  decreaseIsBetter,
  increaseIsBetter,
  getMetricCategoryDefinitionId,
  flattenSummaryGroups,
  allExceptExpectedKeys,
  renderGroupItem,
  processSummary,
} from './utils.js';

type CardProps = {
  title: React.ReactNode;
  type: 'small' | 'large';
  comingSoon?: boolean;
  children?: React.ReactNode;
  width?: 1 | 2;
};

const Card: React.FC<CardProps> = ({
  title,
  children,
  type,
  comingSoon = false,
  width = 1,
}) => (
  <div
    className={`p-6 h-full bg-white rounded-lg shadow ${type === 'large' ? 'mt-4' : ''} ${
      comingSoon ? 'opacity-50' : ''
    } ${width === 2 ? 'col-span-2' : ''}`}
  >
    <h2
      className={`${
        type === 'large' ? 'text-xl' : 'text-lg'
      } mb-5 font-semibold flex items-center`}
    >
      {title}
      {comingSoon && (
        <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">
          coming soon
        </span>
      )}
    </h2>
    {children}
  </div>
);

const FlowMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
  queryPeriodDays: number;
}> = ({ group, workItemTypes, queryPeriodDays }) => {
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?filter=${encodeURIComponent(
    `${filterKey}:${group[filterKey as SummaryGroupKey]}`
  )}`;
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
              data-tooltip-id="react-tooltip"
              data-tooltip-content={`Number of new work items added in the last ${queryPeriodDays} days`}
            >
              New
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={`Number of work items completed in the last ${queryPeriodDays} days`}
            >
              Velocity
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={`Average time taken to complete a work item over the last ${queryPeriodDays} days`}
            >
              Cycle time
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Average time taken to take a work item to production after development is complete"
            >
              CLT
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Fraction of overall time that work items spend in work centers on average"
            >
              Flow efficiency
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={`WIP items over the last ${queryPeriodDays} days`}
            >
              WIP trend
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Average age of work items in progress"
            >
              WIP age
            </th>
          </tr>
        </thead>
        <tbody>
          {['Feature', 'User Story'].map(typeName => {
            const definitionId = getMetricCategoryDefinitionId(workItemTypes, typeName);
            if (!definitionId) return null;

            const workItems = group.workItems[definitionId];
            const workItemsSummary = flattenSummaryGroups(workItems || {});
            const renderMetric = renderGroupItem(
              typeName === 'Feature' ? portfolioProjectLink : projectLink
            );

            return (
              <tr key={typeName}>
                <td className="font-semibold text-sm py-3 align-middle">
                  <span className="inline-flex items-center">
                    <img
                      src={workItemTypes[definitionId].icon}
                      alt="Features"
                      className="w-4 h-4 mr-2"
                    />
                    <span>{workItemTypes[definitionId].name[1]}</span>
                  </span>
                </td>
                <td className="font-semibold text-xl py-3">
                  {renderMetric(
                    <ExtendedLabelWithSparkline
                      data={workItemsSummary.leakageByWeek}
                      {...newItemsSparkline}
                    />,
                    '#new-work-items'
                  )}
                </td>
                <td className="font-semibold text-xl  py-3">
                  {renderMetric(
                    <ExtendedLabelWithSparkline
                      data={workItemsSummary.velocityByWeek}
                      {...velocitySparkline}
                    />,
                    '#velocity'
                  )}
                </td>
                <td className="font-semibold text-xl py-3">
                  {renderMetric(
                    <ExtendedLabelWithSparkline
                      data={workItemsSummary.cycleTimeByWeek}
                      {...cycleTimeSparkline}
                    />,
                    '#cycle-time'
                  )}
                </td>
                <td className="font-semibold text-xl py-3">
                  {renderMetric(
                    <ExtendedLabelWithSparkline
                      data={workItemsSummary.changeLeadTimeByWeek}
                      {...changeLeadTimeSparkline}
                    />,
                    '#change-lead-time'
                  )}
                </td>
                <td className="font-semibold text-xl py-3">
                  {renderMetric(
                    <ExtendedLabelWithSparkline
                      data={workItemsSummary.flowEfficiencyByWeek}
                      {...flowEfficiencySparkline}
                    />,
                    '#flow-efficiency'
                  )}
                </td>
                <td className="font-semibold text-xl py-3">
                  {renderMetric(
                    <ExtendedLabelWithSparkline
                      data={workItemsSummary.wipTrend}
                      {...wipTrendSparkline}
                    />,
                    '#work-in-progress-trend'
                  )}
                </td>
                <td className="font-semibold text-xl py-3">
                  {renderMetric(
                    workItemsSummary.wipAge ? prettyMS(workItemsSummary.wipAge) : '-',
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
  queryPeriodDays: number;
}> = ({ group, workItemTypes, queryPeriodDays }) => {
  const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
  const bugs = bugsDefinitionId ? group.workItems[bugsDefinitionId] : null;
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?filter=${encodeURIComponent(
    `${filterKey}:${group[filterKey as SummaryGroupKey]}`
  )}`;
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
              data-tooltip-id="react-tooltip"
              data-tooltip-content={`Number of bugs opened in the last ${queryPeriodDays} days`}
            >
              New
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={`Number of bugs closed in the last ${queryPeriodDays} days`}
            >
              Fixed
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Average time taken to close a bug"
            >
              Cycle time
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Average time taken to close a bug once development is complete"
            >
              CLT
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Fraction of overall time that work items spend in work centers on average"
            >
              Flow efficiency
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={`WIP items over the last ${queryPeriodDays} days`}
            >
              WIP trend
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Average age of work-in-progress bugs"
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
                  <td className="font-semibold text-sm py-3 align-middle">
                    <span className="inline-flex items-center">
                      {bugsDefinitionId ? (
                        <img
                          src={workItemTypes[bugsDefinitionId].icon}
                          alt="Features"
                          className="w-4 h-4 mr-2"
                        />
                      ) : null}
                      {environment}
                    </span>
                  </td>
                  <td className="font-semibold text-xl py-3">
                    {renderBugMetric(
                      <ExtendedLabelWithSparkline
                        data={bugInfo.leakageByWeek}
                        {...newBugsSparkline}
                      />,
                      '#bug-leakage-with-root-cause'
                    )}
                  </td>
                  <td className="font-semibold text-xl py-3">
                    {renderBugMetric(
                      <ExtendedLabelWithSparkline
                        data={bugInfo.velocityByWeek}
                        {...velocitySparkline}
                      />,
                      '#velocity'
                    )}
                  </td>
                  <td className="font-semibold text-xl py-3">
                    {renderBugMetric(
                      <ExtendedLabelWithSparkline
                        data={bugInfo.cycleTimeByWeek}
                        {...cycleTimeSparkline}
                      />,
                      '#cycle-time'
                    )}
                  </td>
                  <td className="font-semibold text-xl py-3">
                    {renderBugMetric(
                      <ExtendedLabelWithSparkline
                        data={bugInfo.changeLeadTimeByWeek}
                        {...changeLeadTimeSparkline}
                      />,
                      '#change-lead-time'
                    )}
                  </td>
                  <td className="font-semibold text-xl">
                    {renderBugMetric(
                      <ExtendedLabelWithSparkline
                        data={bugInfo.flowEfficiencyByWeek}
                        {...flowEfficiencySparkline}
                      />,
                      '#flow-efficiency'
                    )}
                  </td>
                  <td className="font-semibold text-xl py-3">
                    {renderBugMetric(
                      <ExtendedLabelWithSparkline
                        data={bugInfo.wipTrend}
                        {...wipTrendSparkline}
                      />,
                      '#work-in-progress-trend'
                    )}
                  </td>
                  <td className="font-semibold text-xl py-3">
                    {renderBugMetric(
                      maybe(bugInfo.wipAge).map(prettyMS).getOr('-'),
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
  queryPeriodDays: number;
}> = ({ group, queryPeriodDays }) => {
  const { repoStats, pipelineStats, collection, project } = group;
  const {
    codeQuality,
    repos,
    excluded,
    testsByWeek,
    coverageByWeek,
    newSonarSetupsByWeek,
    sonarCountsByWeek,
    healthyBranches,
    builds,
    ymlPipelines,
    usesCentralTemplate,
    hasPipelines,
  } = repoStats;
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?group=${encodeURIComponent(
    `${group[filterKey as SummaryGroupKey]}`
  )}`;
  const baseProjectLink = `/${collection}/${project}`;
  const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
  const pipelinesMetric = renderGroupItem(
    `${baseProjectLink}/release-pipelines${filterQS}`
  );

  return (
    <>
      <div className="grid grid-cols-2 justify-between">
        <h2 className="text-xs uppercase mt-8 ml-1 font-semibold">Health metrics</h2>
        <p className="justify-self-end mt-8 mr-1 text-xs">
          {'Analysed '}
          <b>{repos}</b>
          {repos === 1 ? ' repo' : ' repos'}
          {excluded ? (
            <>
              {', excluded '}
              <b>{excluded}</b>
              {' inactive'}
              {excluded === 1 ? ' repo' : ' repos'}
            </>
          ) : null}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        <Card title="Test automation" type="small">
          <div className="grid grid-cols-2 gap-4">
            <div
              className="text-xs font-semibold mb-2"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Number of unit / components tests running in build pipelines"
            >
              Tests
              <div className="font-semibold text-xl">
                {reposMetric(
                  <ExtendedLabelWithSparkline
                    data={testsByWeek}
                    {...testAutomationSparkline}
                  />
                )}
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold mb-2"
                data-tooltip-id="react-tooltip"
                data-tooltip-content="Percentage of code covered by tests"
              >
                Coverage
                <div className="text-lg">
                  {reposMetric(
                    <ExtendedLabelWithSparkline
                      data={coverageByWeek}
                      {...coverageSparkline}
                    />
                  )}
                </div>
              </div>
            </div>
            {pipelineStats.stages.map(stage => (
              <Fragment key={stage.name}>
                <div
                  className="text-xs font-semibold"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={`Percentage of pipelines having ${stage.name}`}
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
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={`Percentage of pipelines using ${stage.name}`}
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
            ))}
          </div>
        </Card>

        <Card title="Code quality" type="small">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 grid grid-flow-row gap-4 bg-slate-100 rounded-lg p-3 pl-3 -ml-3 -mt-3 -mb-3">
              <div>
                <div
                  className="text-xs font-semibold"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content="Percentage of repos with Sonar configured"
                >
                  Sonar enabled
                </div>
                <div
                  className="font-semibold text-xl mb-2"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={`${codeQuality.configured} of ${repos} repos have SonarQube configured`}
                >
                  {repos ? (
                    <>
                      {reposMetric(
                        <ExtendedLabelWithSparkline
                          data={newSonarSetupsByWeek}
                          {...newSonarSetupsSparkline(repos)}
                        />
                      )}
                    </>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3">
                <div>
                  <div
                    className="text-xs font-semibold"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content="Percentage of pipelines with sonar configured that pass quality checks"
                  >
                    Ok
                  </div>
                  <div
                    className="font-semibold text-md"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content={`${codeQuality.pass} of ${codeQuality.sonarProjects} sonar projects have 'pass' quality gate`}
                  >
                    {codeQuality.sonarProjects ? (
                      <LabelWithSparkline
                        label={divide(codeQuality.pass, codeQuality.sonarProjects)
                          .map(toPercentage)
                          .getOr('-')}
                        data={sonarCountsByWeek.pass}
                        lineColor={increaseIsBetter(sonarCountsByWeek.pass)}
                        yAxisLabel={n => `${n}%`}
                      />
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xs font-semibold"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content="Percentage of pipelines with sonar configured that have a warning for quality checks"
                  >
                    Warn
                  </div>
                  <div
                    className="font-semibold text-md"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content={`${codeQuality.warn} of ${codeQuality.sonarProjects} sonar projects have 'warn' quality gate`}
                  >
                    {codeQuality.sonarProjects ? (
                      <LabelWithSparkline
                        label={divide(codeQuality.warn, codeQuality.sonarProjects)
                          .map(toPercentage)
                          .getOr('-')}
                        data={sonarCountsByWeek.warn}
                        lineColor={decreaseIsBetter(sonarCountsByWeek.warn)}
                        yAxisLabel={n => `${n}%`}
                      />
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xs font-semibold"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content="Percentage of pipelines with sonar configured that fail quality checks"
                  >
                    Fail
                  </div>
                  <div
                    className="font-semibold text-md"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content={`${codeQuality.fail} of ${codeQuality.sonarProjects} sonar projects have 'fail' quality gate`}
                  >
                    {codeQuality.sonarProjects ? (
                      <LabelWithSparkline
                        label={divide(codeQuality.fail, codeQuality.sonarProjects)
                          .map(toPercentage)
                          .getOr('-')}
                        data={sonarCountsByWeek.fail}
                        lineColor={decreaseIsBetter(sonarCountsByWeek.fail)}
                        yAxisLabel={n => `${n}%`}
                      />
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-rows-2 gap-10">
              <div>
                <div
                  className="text-xs font-semibold"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content="Percentage of pipelines conforming to branch policies"
                >
                  Branch policy met
                </div>
                <div className="font-semibold text-xl">
                  {pipelinesMetric(
                    divide(
                      pipelineStats.conformsToBranchPolicies,
                      pipelineStats.pipelines
                    )
                      .map(toPercentage)
                      .getOr('-')
                  )}
                </div>
              </div>

              <div>
                <div
                  className="text-xs font-semibold"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content="Percentage of healthy branches"
                >
                  Healthy branches
                </div>
                <div className="font-semibold text-xl">
                  {reposMetric(
                    divide(healthyBranches.count, healthyBranches.total)
                      .map(toPercentage)
                      .getOr('-')
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="CI builds" type="small">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div
                className="text-xs font-semibold"
                data-tooltip-id="react-tooltip"
                data-tooltip-content={`Number of CI builds run in the last ${queryPeriodDays} days`}
              >
                Runs
                <div className="font-semibold text-xl mb-2">
                  {reposMetric(
                    <ExtendedLabelWithSparkline
                      data={builds.byWeek}
                      {...buildRunsSparkline}
                    />
                  )}
                </div>
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tooltip-id="react-tooltip"
                data-tooltip-content="Percentage of successful builds"
              >
                Success
              </div>
              <div className="font-semibold text-lg">
                {reposMetric(
                  <LabelWithSparkline
                    label={divide(builds.successful, builds.total)
                      .map(toPercentage)
                      .getOr('-')}
                    data={builds.successfulByWeek}
                    lineColor={increaseIsBetter(builds.successfulByWeek)}
                    yAxisLabel={x => `${x}%`}
                  />
                )}
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tooltip-id="react-tooltip"
                data-tooltip-content="Number of pipelines configured using a YAML file"
              >
                YAML pipelines
              </div>
              <div className="text-xl font-semibold">
                {reposMetric(
                  divide(ymlPipelines.count, ymlPipelines.total)
                    .map(toPercentage)
                    .getOr('-')
                )}
              </div>
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                data-tooltip-id="react-tooltip"
                data-tooltip-content="Number of build runs that used the central template"
              >
                Uses central template
              </div>
              <div className="text-xl font-semibold">
                {reposMetric(
                  divide(usesCentralTemplate.count, usesCentralTemplate.total)
                    .map(toPercentage)
                    .getOr('-')
                )}
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
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content="Percentage of releases where all the artifacts were from the master branch"
                >
                  Master-only releases
                </div>
                <div className="font-semibold text-xl">
                  {pipelinesMetric(
                    <LabelWithSparkline
                      label={divide(
                        pipelineStats.masterOnlyPipelines.count,
                        pipelineStats.masterOnlyPipelines.total
                      )
                        .map(toPercentage)
                        .getOr('-')}
                      data={pipelineStats.masterOnlyReleasesByWeek}
                      lineColor={increaseIsBetter(
                        pipelineStats.masterOnlyReleasesByWeek.filter(exists)
                      )}
                      yAxisLabel={x => `${x}%`}
                      renderer={pathRendererSkippingUndefineds}
                    />
                  )}
                </div>
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content="Number of release pipelines that have a starting artifact"
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
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content="Number of repos that have associated release pipelines"
                >
                  Repos with release pipelines
                </div>
                <div className="font-semibold text-xl">
                  {reposMetric(divide(hasPipelines, repos).map(toPercentage).getOr('-'))}
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
      </div>
    </>
  );
};

const SummaryItem: React.FC<SummaryItemProps> = ({
  group,
  workItemTypes,
  queryPeriodDays,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const summaryRef = useRef<HTMLElement>(null);

  return (
    <details>
      <summary
        className="text-2xl font-bold group cursor-pointer"
        id={group.groupName}
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
          <h2 className="text-xs uppercase mt-8 ml-1 font-semibold">Value metrics</h2>
          <FlowMetrics
            group={group}
            workItemTypes={workItemTypes}
            queryPeriodDays={queryPeriodDays}
          />
          <QualityMetrics
            group={group}
            workItemTypes={workItemTypes}
            queryPeriodDays={queryPeriodDays}
          />
          <HealthMetrics group={group} queryPeriodDays={queryPeriodDays} />
        </>
      )}
    </details>
  );
};

const SummaryByTeam: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
  queryPeriodDays: number;
}> = ({ groups, workItemTypes, queryPeriodDays }) => (
  <ul className="bg-gray-50 p-8 rounded-lg">
    {groups.sort(asc(byString(prop('groupName')))).map(group => (
      <li key={group.groupName} className="mb-8">
        <SummaryItem
          group={group}
          workItemTypes={workItemTypes}
          queryPeriodDays={queryPeriodDays}
        />
      </li>
    ))}
  </ul>
);

export default SummaryByTeam;
