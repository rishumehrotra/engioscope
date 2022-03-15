import React, {
  Fragment, useRef, useState
} from 'react';
import type { SummaryMetrics } from '../../../shared/types';
import { num, prettyMS } from '../../helpers/utils';
import Sparkline from '../graphs/Sparkline';
import type { SummaryGroupKey, SummaryItemProps } from './utils';
import {
  decreaseIsBetter,
  increaseIsBetter,
  getMetricCategoryDefinitionId, flattenSummaryGroups, allExceptExpectedKeys,
  renderGroupItem, processSummary
} from './utils';

const FLowMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ group, workItemTypes }) => {
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
  const projectLink = `/${group.collection}/${group.project}/${filterQS}`;
  const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-lg h-full shadow mt-4">
      <h1 className="text-xl font-semibold mb-5 flex items-center">Flow Metrics</h1>

      <table className="w-full">
        <thead>
          <tr>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th className="w-1/12" />
            <th
              className="text-xs font-semibold py-3 w-1/12"
              data-tip="Number of new work items added in the last 30 days"
            >
              New
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Number of work items completed in the last 30 days"
            >
              Velocity
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Average time taken to complete a work item over the last 30 days"
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
              data-tip="Increase in the number of WIP items over the last 30 days"
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
            const workItemsSummary = flattenSummaryGroups(workItems);
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
                <td>
                  {renderMetric(
                    `${workItemsSummary.leakage}`,
                    <Sparkline
                      data={workItemsSummary.leakageByWeek}
                      lineColor={increaseIsBetter(workItemsSummary.leakageByWeek)}
                    />,
                    '#work-in-progress-trend'
                  )}
                </td>
                <td>
                  {renderMetric(
                    `${workItemsSummary.velocity}`,
                    <Sparkline
                      data={workItemsSummary.velocityByWeek}
                      lineColor={increaseIsBetter(workItemsSummary.velocityByWeek)}
                    />,
                    '#velocity'
                  )}
                </td>
                <td>
                  {renderMetric(
                    workItemsSummary.cycleTime
                      ? prettyMS(workItemsSummary.cycleTime)
                      : '-',
                    <Sparkline
                      data={workItemsSummary.cycleTimeByWeek}
                      lineColor={decreaseIsBetter(workItemsSummary.cycleTimeByWeek)}
                    />,
                    '#cycle-time'
                  )}
                </td>
                <td>
                  {renderMetric(
                    workItemsSummary.changeLeadTime
                      ? prettyMS(workItemsSummary.changeLeadTime)
                      : '-',
                    <Sparkline
                      data={workItemsSummary.changeLeadTimeByWeek}
                      lineColor={decreaseIsBetter(workItemsSummary.changeLeadTimeByWeek)}
                    />,
                    '#change-lead-time'
                  )}
                </td>
                <td>
                  {renderMetric(
                    <>
                      {workItemsSummary.wipIncrease}
                      <span className="text-lg text-gray-500 inline-block ml-2">
                        <span className="font-normal text-sm">of</span>
                        {' '}
                        {workItemsSummary.wipCount}
                      </span>
                    </>,
                    <Sparkline
                      data={workItemsSummary.wipIncreaseByWeek}
                      lineColor={decreaseIsBetter(workItemsSummary.wipIncreaseByWeek)}
                    />,
                    '#work-in-progress-trend'
                  )}
                </td>
                <td>
                  {renderMetric(
                    workItemsSummary.wipAge
                      ? prettyMS(workItemsSummary.wipAge)
                      : '-',
                    null,
                    '#age-of-work-in-progress-items'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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

  if (!bugs) return null;

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-lg h-full shadow mt-4">
      <h1 className="text-xl font-semibold mb-5 flex items-center">Quality Metrics</h1>
      <table className="w-full">
        <thead>
          <tr>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th className="w-1/12" />
            <th
              className="text-xs font-semibold py-3 w-1/12"
              data-tip="Number of bugs opened in the last 30 days"
            >
              New
            </th>
            <th
              className="text-xs font-semibold w-1/12"
              data-tip="Number of bugs closed in the last 30 days"
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
          {Object.entries(bugs).map(([environment, envBasedBugInfo]) => {
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
                    `${bugInfo.leakage}`,
                    <Sparkline
                      data={bugInfo.leakageByWeek}
                      lineColor={decreaseIsBetter(bugInfo.leakageByWeek)}
                    />,
                    '#bug-leakage-with-root-cause'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderBugMetric(
                    `${bugInfo.velocity}`,
                    <Sparkline
                      data={bugInfo.velocityByWeek}
                      lineColor={increaseIsBetter(bugInfo.velocityByWeek)}
                    />,
                    '#velocity'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderBugMetric(
                    bugInfo.cycleTime
                      ? prettyMS(bugInfo.cycleTime)
                      : '-',
                    <Sparkline
                      data={bugInfo.cycleTimeByWeek}
                      lineColor={decreaseIsBetter(bugInfo.cycleTimeByWeek)}
                    />,
                    '#cycle-time'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderBugMetric(
                    bugInfo.changeLeadTime
                      ? prettyMS(bugInfo.changeLeadTime)
                      : '-',
                    <Sparkline
                      data={bugInfo.changeLeadTimeByWeek}
                      lineColor={decreaseIsBetter(bugInfo.changeLeadTimeByWeek)}
                    />,
                    '#change-lead-time'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderBugMetric(
                    <>
                      {bugInfo.wipIncrease}
                      <span className="text-lg text-gray-500 inline-block ml-2">
                        <span className="font-normal text-sm">of</span>
                        {' '}
                        {bugInfo.wipCount}
                      </span>
                    </>,
                    <Sparkline
                      data={bugInfo.wipIncreaseByWeek}
                      lineColor={decreaseIsBetter(bugInfo.wipIncreaseByWeek)}
                    />,
                    '#work-in-progress-trend'
                  )}
                </td>
                <td className="font-semibold text-xl">
                  {renderBugMetric(
                    bugInfo.wipAge
                      ? prettyMS(bugInfo.wipAge)
                      : '-',
                    null,
                    '#age-of-work-in-progress-items'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
          {`Analysed ${repoStats.repos} ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
          {repoStats.excluded ? `, excluded ${repoStats.excluded} ${repoStats.excluded === 1 ? 'repo' : 'repos'}` : ''}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        <div className="p-6 h-full bg-white rounded-lg shadow">
          <div className="text-lg font-semibold mb-5 flex items-center">Test Automation</div>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            <div
              className="text-xs font-semibold"
              data-tip="Number of unit / components tests running in build pipelines"
            >
              Tests
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Percentage of code covered by tests"
            >
              Coverage
            </div>
            {
              pipelineStats.stages.map(stage => (
                <Fragment key={stage.name}>
                  <div
                    className="text-xs font-semibold"
                    data-tip={`Percentage of pipelines having ${stage.name}`}
                  >
                    {`Pipelines having ${stage.name}`}
                  </div>
                  <div
                    className="text-xs font-semibold"
                    data-tip={`Percentage of pipelines using ${stage.name}`}
                  >
                    {`Pipelines using ${stage.name}`}
                  </div>
                </Fragment>
              ))
            }

            <div className="font-semibold text-xl">{reposMetric(num(repoStats.tests), null)}</div>
            <div className="text-xs uppercase">
              Coming
              <br />
              soon
            </div>
            {
              pipelineStats.stages.map(stage => (
                <Fragment key={stage.name}>
                  <div className="font-semibold text-xl">
                    {pipelinesMetric(
                      pipelineStats.pipelines === 0 ? '0' : `${Math.round((stage.exists * 100) / pipelineStats.pipelines)}%`
                    )}
                  </div>
                  <div className="font-semibold text-xl">
                    {
                      pipelinesMetric(
                        pipelineStats.pipelines === 0 ? '0' : `${Math.round((stage.used * 100) / pipelineStats.pipelines)}%`
                      )
                    }
                  </div>
                </Fragment>
              ))
            }
          </div>
        </div>

        <div className="p-6 h-full bg-white rounded-lg shadow">
          <div className="text-lg font-semibold mb-5 flex items-center">Code Quality</div>
          <div className="grid grid-cols-6 gap-x-1">
            <div className="col-span-6 grid grid-cols-6 gap-y-4">
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of repos with Sonar configured"
              >
                Sonar enabled
              </div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of pipelines with sonar configured that pass quality checks"
              >
                Ok
              </div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of pipelines with sonar configured that have a warning for quality checks"
              >
                Warn
              </div>
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of pipelines with sonar configured that fail quality checks"
              >
                Fail
              </div>
              <div />
              <div
                className="text-xs font-semibold"
                data-tip="Percentage of pipelines conforming to branch policies"
              >
                Branch policy met
              </div>

              <div
                className="font-semibold text-xl"
                data-tip={`${codeQuality.configured} of ${repoStats.repos} repos have SonarQube configured`}
              >
                {repoStats.repos ? reposMetric(`${((codeQuality.configured / repoStats.repos) * 100).toFixed(0)}%`) : '-'}
              </div>
              <div
                className="font-semibold text-md"
                data-tip={`${codeQuality.pass} of ${codeQuality.sonarProjects} sonar projects have 'pass' quality gate`}
              >
                {codeQuality.sonarProjects
                  ? `${Math.round((codeQuality.pass / codeQuality.sonarProjects) * 100)}%`
                  : '-'}
              </div>
              <div
                className="font-semibold text-md"
                data-tip={`${codeQuality.warn} of ${codeQuality.sonarProjects} sonar projects have 'warn' quality gate`}
              >
                {codeQuality.sonarProjects
                  ? `${Math.round((codeQuality.warn / codeQuality.sonarProjects) * 100)}%`
                  : '-'}
              </div>
              <div
                className="font-semibold text-md"
                data-tip={`${codeQuality.fail} of ${codeQuality.sonarProjects} sonar projects have 'fail' quality gate`}
              >
                {codeQuality.sonarProjects
                  ? `${Math.round((codeQuality.fail / codeQuality.sonarProjects) * 100)}%`
                  : '-'}
              </div>
              <div />
              <div className="font-semibold text-xl">
                {pipelinesMetric(
                  pipelineStats.pipelines === 0 ? '0'
                    : `${Math.round((pipelineStats.conformsToBranchPolicies * 100) / pipelineStats.pipelines)}%`
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="p-6 h-full bg-white rounded-lg shadow">
          <div className="text-lg font-semibold mb-5 flex items-center">CI-CD</div>
          <div className="grid grid-cols-5 gap-y-4">
            <div
              className="text-xs font-semibold"
              data-tip="Number of CI builds run in the last 30 days"
            >
              Builds
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Percentage of successful builds"
            >
              Success
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Average time taken to fix a build failure"
            >
              MTTR build failure
            </div>
            <div />
            <div
              className="text-xs font-semibold"
              data-tip="Number of release pipelines that only release from the master branch"
            >
              Master only pipelines
            </div>

            <div className="font-semibold text-xl">{reposMetric(num(repoStats.builds.total))}</div>
            <div className="font-semibold text-xl">
              {reposMetric(
                `${repoStats.builds.total ? `${((repoStats.builds.successful * 100) / repoStats.builds.total).toFixed(0)}%` : '-'}`
              )}
            </div>
            <div className="text-xs uppercase">
              Coming
              <br />
              soon
            </div>
            <div />
            <div className="font-semibold text-xl">
              {pipelinesMetric(
                pipelineStats.pipelines === 0 ? '0'
                  : `${Math.round((pipelineStats.masterOnlyPipelines.count * 100) / pipelineStats.masterOnlyPipelines.total)}%`
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg h-full shadow opacity-50">
          <div className="text-lg font-semibold mb-5 flex items-center">
            Contract driven development
            <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">coming soon</span>
          </div>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            <div
              className="text-xs font-semibold"
              data-tip="Number of contracts tests"
            >
              Contract Tests
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Number of contract tests used for service virtualisation"
            >
              Contracts used as stubs
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Number of unused contract tests"
            >
              Orphaned contracts
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Percentage of APIs covered by contract tests"
            >
              Coverage
            </div>

            <div className="font-semibold text-xl">xx</div>
            <div className="font-semibold text-xl">xx</div>
            <div className="font-semibold text-xl">xx</div>
            <div className="font-semibold text-xl">xx%</div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg h-full shadow opacity-50">
          <div className="text-lg font-semibold mb-5 flex items-center">
            Infrastructure
            <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">coming soon</span>
          </div>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            <div
              className="text-xs font-semibold"
              data-tip="Total planned downtime (in mins) due to deployments"
            >
              Deployment Downtime
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Percentage of pipelines where EAT infrastructure is provisioned on-demand via Azure Pipelines"
            >
              Ephemeral EAT
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Percentage of components that are containerized"
            >
              Containers
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Percentage of release pipelines deploying EAT artifact to public cloud"
            >
              Infra on public cloud
            </div>

            <div className="font-semibold text-xl">
              xx
              {' '}
              <span className="text-sm">mins</span>
            </div>
            <div className="font-semibold text-xl">xx%</div>
            <div className="font-semibold text-xl">xx%</div>
            <div className="font-semibold text-xl">xx%</div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg h-full shadow opacity-50">
          <div className="text-lg font-semibold mb-5 flex items-center">
            Feature toggles
            <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">coming soon</span>
          </div>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            <div
              className="text-xs font-semibold"
              data-tip="Number of independent deployments enabled by feature toggles"
            >
              Independent deployments
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Average age of a feature toggle once toggled on"
            >
              Toggled ON (Avg. age)
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Average age that a feature toggle has been toggled off"
            >
              Toggled OFF (Avg. age)
            </div>
            <div
              className="text-xs font-semibold"
              data-tip="Number of bugs raised where the RCA is due to feature toggles"
            >
              Bugs due to toggles
            </div>

            <div className="font-semibold text-xl">xx</div>
            <div className="font-semibold text-xl">
              xx
              {' '}
              <span className="text-sm">days</span>
            </div>
            <div className="font-semibold text-xl">
              xx
              {' '}
              <span className="text-sm">days</span>
            </div>
            <div className="font-semibold text-xl">xx</div>
          </div>
        </div>
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
          <FLowMetrics group={group} workItemTypes={workItemTypes} />
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
      .sort((a, b) => (a.groupName.toLowerCase() < b.groupName.toLowerCase() ? -1 : 1))
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
