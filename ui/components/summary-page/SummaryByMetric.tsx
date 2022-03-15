import type { ReactNode } from 'react';
import React, { Fragment } from 'react';
import type { SummaryMetrics } from '../../../shared/types';
import { num, prettyMS } from '../../helpers/utils';
import { ExternalLink } from '../common/Icons';
import Sparkline from '../graphs/Sparkline';
import type { SummaryGroupKey } from './utils';
import {
  decreaseIsBetter, increaseIsBetter, processSummary,
  flattenSummaryGroups, getMetricCategoryDefinitionId, allExceptExpectedKeys
} from './utils';

const renderGroupItem = (link: string) => (label: ReactNode, anchor = '') => (
  <span className="group">
    <a
      href={`${link}${anchor}`}
      className="text-blue-500"
      target="_blank"
      rel="noreferrer"
    >
      <span className="font-medium text-lg text-black">{label}</span>
      <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
    </a>
  </span>
);

const FlowMetricsByWorkItemType: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
  workItemTypeName: string;
}> = ({ groups, workItemTypes, workItemTypeName }) => (
  <details>
    <summary className="font-semibold text-xl my-2 cursor-pointer">
      <span className="inline-flex align-middle">
        <img
          src={Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.icon}
          alt={`Icon for ${Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.name[1]}`}
          className="inline-block mr-1"
          width="18"
        />
        {Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.name[1]}
      </span>
    </summary>

    <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
      <table className="w-full">
        <thead className="bg-gray-800 text-white">
          <tr>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th />
            <th
              className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
              data-tip="Number of new work items added in the last 30 days"
            >
              New
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
              data-tip="Number of work items completed in the last 30 days"
            >
              Velocity
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
              data-tip="Average time taken to complete a work item over the last 30 days"
            >
              Cycle time
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
              data-tip="Average time taken to take a work item to production after development is complete"
            >
              CLT
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
              data-tip="Increase in the number of WIP items over the last 30 days"
            >
              WIP increase
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
              data-tip="Average age of work items in progress"
            >
              WIP age
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {groups
            .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
            .map(group => {
              const wiDefinitionId = getMetricCategoryDefinitionId(workItemTypes, workItemTypeName);
              const stats = wiDefinitionId ? group.summary[wiDefinitionId] : null;
              const summary = stats ? flattenSummaryGroups(stats) : null;
              const [filterKey] = allExceptExpectedKeys(group);
              const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
              const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

              const renderMetric = renderGroupItem(portfolioProjectLink);

              if (!summary) return null;

              return (
                <tr key={group.groupName} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-semibold">
                    {group.groupName}
                  </td>
                  <td className="px-6 py-3">
                    {renderMetric(
                      <>
                        {summary.leakage}
                        <Sparkline
                          data={summary.leakageByWeek}
                          lineColor={increaseIsBetter(summary.leakageByWeek)}
                          className="ml-2"
                        />
                      </>,
                      '#work-in-progress-trend'
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {renderMetric(
                      <>
                        {summary.velocity}
                        <Sparkline
                          data={summary.velocityByWeek}
                          lineColor={increaseIsBetter(summary.velocityByWeek)}
                          className="ml-2"
                        />
                      </>,
                      '#velocity'
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {renderMetric(
                      summary.cycleTime
                        ? (
                          <>
                            {prettyMS(summary.cycleTime)}
                            <Sparkline
                              data={summary.cycleTimeByWeek}
                              lineColor={decreaseIsBetter(summary.cycleTimeByWeek)}
                              className="ml-2"
                            />
                          </>
                        ) : '-',
                      '#cycle-time'
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {renderMetric(summary.changeLeadTime
                      ? (
                        <>
                          {prettyMS(summary.changeLeadTime)}
                          <Sparkline
                            data={summary.changeLeadTimeByWeek}
                            lineColor={decreaseIsBetter(summary.changeLeadTimeByWeek)}
                            className="ml-2"
                          />
                        </>
                      )
                      : '-',
                    '#change-lead-time')}
                  </td>
                  <td className="px-6 py-3">
                    {renderMetric(
                      summary.wipCount
                        ? (
                          <>
                            {summary.wipIncrease}
                            <span className="text-lg text-gray-500 inline-block ml-2">
                              <span className="font-normal text-sm">of</span>
                              {' '}
                              {summary.wipCount}
                              <Sparkline
                                data={summary.wipIncreaseByWeek}
                                lineColor={decreaseIsBetter(summary.wipIncreaseByWeek)}
                                className="ml-2"
                              />
                            </span>
                          </>
                        )
                        : '0',
                      '#age-of-work-in-progress-features-by-state'
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {renderMetric(summary.wipAge ? prettyMS(summary.wipAge) : '-', '#age-of-work-in-progress-items')}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>

  </details>
);

const equivalientEnvironments = ['Replica', 'Pre-Prod'];

const QualityMetrics: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ groups, workItemTypes }) => {
  const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
  if (!bugsDefinitionId) return null;
  const allEnvironments = [...new Set(groups.map(group => Object.keys(group.summary[bugsDefinitionId] || {})).flat())];

  let encounteredEquivalentEnvironment = false;

  return (
    <>
      {allEnvironments.map(env => {
        const envDisplayName = equivalientEnvironments.includes(env) ? equivalientEnvironments.join(' or ') : env;

        if (equivalientEnvironments.includes(env) && encounteredEquivalentEnvironment) return null;

        if (equivalientEnvironments.includes(env)) encounteredEquivalentEnvironment = true;

        return (
          <details key={envDisplayName}>
            <summary className="font-semibold text-xl my-2 cursor-pointer">
              <span className="inline-flex align-middle">
                <img
                  src={workItemTypes[bugsDefinitionId].icon}
                  alt={`Icon for ${envDisplayName} ${workItemTypes[bugsDefinitionId].name[0]}`}
                  className="inline-block mr-1"
                  width="18"
                />
                {envDisplayName}
              </span>
            </summary>

            <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
              <table className="w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                    <th />
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      data-tip="Number of bugs opened in the last 30 days"
                    >
                      New bugs
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      data-tip="Number of bugs closed in the last 30 days"
                    >
                      Bugs fixed
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      data-tip="Average time taken to close a bug"
                    >
                      Bugs cycle time
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      data-tip="Average time taken to close a bug once development is complete"
                    >
                      Bugs CLT
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      data-tip="Increase in the number of WIP bugs over the last 30 days"
                    >
                      WIP increase
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      data-tip="Average age of work-in-progress bugs"
                    >
                      WIP age
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groups
                    .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
                    .map(group => {
                      const bugs = group.summary[bugsDefinitionId] || {};
                      const summaryBugsForEnv = (
                        equivalientEnvironments.includes(env)
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        && bugs[equivalientEnvironments.find(e => bugs[e])!]
                      ) || bugs[env];

                      const bugsForEnv = summaryBugsForEnv ? processSummary(summaryBugsForEnv) : null;

                      const [filterKey] = allExceptExpectedKeys(group);
                      const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
                      const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

                      const renderBugMetric = renderGroupItem(portfolioProjectLink);

                      return (
                        <tr className="hover:bg-gray-50" key={group.groupName}>
                          <td className="px-6 py-3 font-semibold">{group.groupName}</td>
                          <td className="px-6 py-3">
                            {renderBugMetric(
                              bugsForEnv
                                ? (
                                  <>
                                    {bugsForEnv.leakage}
                                    <Sparkline
                                      data={bugsForEnv.leakageByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.leakageByWeek)}
                                      className="ml-2"
                                    />
                                  </>
                                )
                                : '-',
                              '#bugs'
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {renderBugMetric(
                              bugsForEnv
                                ? (
                                  <>
                                    {bugsForEnv.velocity}
                                    <Sparkline
                                      data={bugsForEnv.velocityByWeek}
                                      lineColor={increaseIsBetter(bugsForEnv.velocityByWeek)}
                                      className="ml-2"
                                    />
                                  </>
                                )
                                : '-',
                              '#velocity'
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {renderBugMetric(
                              bugsForEnv?.cycleTime
                                ? (
                                  <>
                                    {prettyMS(bugsForEnv.cycleTime)}
                                    <Sparkline
                                      data={bugsForEnv.cycleTimeByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.cycleTimeByWeek)}
                                      className="ml-2"
                                    />
                                  </>
                                )
                                : '-',
                              '#cycle-time'
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {renderBugMetric(
                              bugsForEnv?.changeLeadTime
                                ? (
                                  <>
                                    {prettyMS(bugsForEnv.changeLeadTime)}
                                    <Sparkline
                                      data={bugsForEnv.changeLeadTimeByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.changeLeadTimeByWeek)}
                                      className="ml-2"
                                    />
                                  </>
                                )
                                : '-',
                              '#change-lead-time'
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {renderBugMetric(
                              bugsForEnv
                                ? (
                                  <>
                                    {bugsForEnv.wipIncrease}
                                    <span className="text-lg text-gray-500 inline-block ml-2">
                                      <span className="font-normal text-sm">of</span>
                                      {' '}
                                      {bugsForEnv.wipCount}
                                    </span>
                                    <Sparkline
                                      data={bugsForEnv.wipIncreaseByWeek}
                                      lineColor={decreaseIsBetter(bugsForEnv.wipIncreaseByWeek)}
                                      className="ml-2"
                                    />
                                  </>
                                )
                                : '-',
                              '#work-in-progress-trend'
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {renderBugMetric(bugsForEnv?.wipAge ? prettyMS(bugsForEnv.wipAge) : '-', '#age-of-work-in-progress-items')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </>
  );
};

const TestAutomationMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
    <table className="w-full">
      <thead className="bg-gray-800 text-white">
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Number of unit / components tests running in build pipelines"
          >
            Tests
          </th>
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Percentage of code covered by tests"
          >
            Coverage
          </th>
          {
            groups[0].pipelineStats.stages.map(stage => (
              <Fragment key={stage.name}>
                <td
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  data-tip={`Percentage of pipelines having ${stage.name}`}
                >
                  {`Pipelines having ${stage.name}`}
                </td>
                <td
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  data-tip={`Percentage of pipelines using ${stage.name}`}
                >
                  {`Pipelines using ${stage.name}`}
                </td>
              </Fragment>
            ))
          }

        </tr>
      </thead>
      <tbody>
        {groups
          .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
          .map(group => {
            const { repoStats, pipelineStats } = group;
            const [filterKey] = allExceptExpectedKeys(group);
            const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
            const baseProjectLink = `/${group.collection}/${group.project}`;
            const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
            const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

            return (
              <tr className="hover:bg-gray-50" key={group.groupName}>
                <td className="px-6 py-3 font-semibold">
                  {group.groupName}
                  <p className="justify-self-end text-xs text-gray-500">
                    {`Analysed ${repoStats.repos} ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
                    {repoStats.excluded ? `, excluded ${repoStats.excluded} ${repoStats.excluded === 1 ? 'repo' : 'repos'}` : ''}
                  </p>
                </td>
                <td className="px-6 py-3">
                  {reposMetric(num(repoStats.tests))}
                </td>
                <td className="px-6 py-3">
                  <span className="bg-gray-100 py-1 px-2 rounded text-xs uppercase">Coming soon</span>
                </td>
                {
                  pipelineStats.stages.map(stage => (
                    <Fragment key={stage.name}>
                      <td className="px-6 py-3">
                        {pipelinesMetric(
                          pipelineStats.pipelines === 0 ? '0' : `${Math.round((stage.exists * 100) / pipelineStats.pipelines)}%`
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {
                          pipelinesMetric(
                            pipelineStats.pipelines === 0 ? '0' : `${Math.round((stage.used * 100) / pipelineStats.pipelines)}%`
                          )
                        }
                      </td>
                    </Fragment>
                  ))
                }
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
);

const CodeQualityMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
    <table className="w-full">
      <thead className="bg-gray-800 text-white">
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Percentage of repos with Sonar configured"
          >
            Sonar
          </th>
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Percentage of pipelines with sonar configured that pass quality checks"
          >
            Ok
          </th>
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Percentage of pipelines with sonar configured that have a warning for quality checks"
          >
            Warn
          </th>
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Percentage of pipelines with sonar configured that fail quality checks"
          >
            Fail
          </th>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th
            className="px-12 py-3 text-left text-xs font-medium uppercase tracking-wider"
          />
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Percentage of pipelines conforming to branch policies"
          >
            Branch policy met
          </th>
        </tr>
      </thead>
      <tbody>
        {groups
          .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
          .map(group => {
            const { repoStats, pipelineStats } = group;
            const { codeQuality } = repoStats;
            const [filterKey] = allExceptExpectedKeys(group);
            const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
            const baseProjectLink = `/${group.collection}/${group.project}`;
            const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
            const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

            return (
              <tr className="hover:bg-gray-50" key={group.groupName}>
                <td className="px-6 py-3 font-semibold">
                  {group.groupName}
                  <p className="justify-self-end text-xs text-gray-500">
                    {`Analysed ${repoStats.repos} ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
                    {repoStats.excluded ? `, excluded ${repoStats.excluded} ${repoStats.excluded === 1 ? 'repo' : 'repos'}` : ''}
                  </p>
                </td>
                <td
                  data-tip={`${codeQuality.configured} of ${repoStats.repos} repos have SonarQube configured`}
                  className="px-6 py-3 font-medium text-lg text-black"
                >
                  {repoStats.repos ? reposMetric(`${((codeQuality.configured / repoStats.repos) * 100).toFixed(0)}%`) : '-'}
                </td>
                <td
                  data-tip={`${codeQuality.pass} of ${codeQuality.sonarProjects} sonar projects have 'pass' quality gate`}
                  className="px-6 py-3 font-medium text-lg text-black"
                >
                  {codeQuality.sonarProjects
                    ? `${Math.round((codeQuality.pass / codeQuality.sonarProjects) * 100)}%`
                    : '-'}
                </td>
                <td
                  data-tip={`${codeQuality.warn} of ${codeQuality.sonarProjects} sonar projects have 'warn' quality gate`}
                  className="px-6 py-3 font-medium text-lg text-black"
                >
                  {codeQuality.sonarProjects
                    ? `${Math.round((codeQuality.warn / codeQuality.sonarProjects) * 100)}%`
                    : '-'}
                </td>
                <td
                  data-tip={`${codeQuality.fail} of ${codeQuality.sonarProjects} sonar projects have 'fail' quality gate`}
                  className="px-6 py-3 font-medium text-lg text-black"
                >
                  {codeQuality.sonarProjects
                    ? `${Math.round((codeQuality.fail / codeQuality.sonarProjects) * 100)}%`
                    : '-'}
                </td>
                <td className="px-6 py-3 font-medium text-lg text-black" />
                <td className="px-6 py-3 font-medium text-lg text-black">
                  {pipelinesMetric(
                    pipelineStats.pipelines === 0 ? '0'
                      : `${Math.round((pipelineStats.conformsToBranchPolicies * 100) / pipelineStats.pipelines)}%`
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
);

const CICDMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
    <table className="w-full">
      <thead className="bg-gray-800 text-white">
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Number of CI builds run in the last 30 days"
          >
            Builds
          </th>
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Percentage of successful builds"
          >
            Success
          </th>
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Average time taken to fix a build failure"
          >
            MTTR build failure
          </th>
          <th
            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            data-tip="Number of release pipelines that only release from the master branch"
          >
            Master only pipelines
          </th>
        </tr>
      </thead>
      <tbody>
        {groups
          .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
          .map(group => {
            const { repoStats, pipelineStats } = group;
            const [filterKey] = allExceptExpectedKeys(group);
            const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
            const baseProjectLink = `/${group.collection}/${group.project}`;
            const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
            const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

            return (
              <tr className="hover:bg-gray-50" key={group.groupName}>
                <td className="px-6 py-3 font-semibold">
                  {group.groupName}
                  <p className="justify-self-end text-xs text-gray-500">
                    {`Analysed ${repoStats.repos} ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
                    {repoStats.excluded ? `, excluded ${repoStats.excluded} ${repoStats.excluded === 1 ? 'repo' : 'repos'}` : ''}
                  </p>
                </td>
                <td className="px-6 py-3 font-medium text-lg text-black">
                  {reposMetric(num(repoStats.builds.total))}
                </td>
                <td className="px-6 py-3 font-medium text-lg text-black">
                  {reposMetric(
                    `${repoStats.builds.total ? `${((repoStats.builds.successful * 100) / repoStats.builds.total).toFixed(0)}%` : '-'}`
                  )}
                </td>
                <td className="px-6 py-3 font-medium text-lg text-black">
                  <span className="bg-gray-100 py-1 px-2 rounded text-xs uppercase">Coming soon</span>
                </td>
                <td className="px-6 py-3 font-medium text-lg text-black">
                  {pipelinesMetric(
                    pipelineStats.pipelines === 0 ? '0'
                      : `${Math.round((pipelineStats.masterOnlyPipelines.count * 100) / pipelineStats.masterOnlyPipelines.total)}%`
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
);

const SummaryByMetric: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ groups, workItemTypes }) => (
  <div className="mt-8">
    <h2 className="text-2xl font-bold">Flow metrics</h2>

    <FlowMetricsByWorkItemType
      groups={groups}
      workItemTypes={workItemTypes}
      workItemTypeName="Feature"
    />

    <FlowMetricsByWorkItemType
      groups={groups}
      workItemTypes={workItemTypes}
      workItemTypeName="User Story"
    />

    <h2 className="text-2xl font-bold mt-8">Quality metrics</h2>
    <QualityMetrics groups={groups} workItemTypes={workItemTypes} />

    <h2 className="text-2xl font-bold mt-8">Health metrics</h2>
    <details>
      <summary className="font-semibold text-xl my-2 cursor-pointer">Test automation</summary>
      <TestAutomationMetrics groups={groups} />
    </details>

    <details>
      <summary className="font-semibold text-xl my-2 cursor-pointer">Code quality</summary>
      <CodeQualityMetrics groups={groups} />
    </details>

    <details>
      <summary className="font-semibold text-xl my-2 cursor-pointer">CI-CD</summary>
      <CICDMetrics groups={groups} />
    </details>
  </div>
);

export default SummaryByMetric;
