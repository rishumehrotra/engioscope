import { sum } from 'rambda';
import React, { Fragment } from 'react';
import type { SummaryMetrics } from '../../../shared/types';
import { num, prettyMS } from '../../helpers/utils';
import type { SummaryGroupKey, SummaryItemProps } from './utils';
import {
  getMetricCategoryDefinitionId, flattenSummaryGroups, allExceptExpectedKeys,
  renderGroupItem, processSummary
} from './utils';

const FlowMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ group, workItemTypes }) => {
  const userStoryDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'User Story');
  const featuresDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Feature');
  const userStories = userStoryDefinitionId ? group.summary[userStoryDefinitionId] : null;
  const userStoriesSummary = userStories ? flattenSummaryGroups(userStories) : null;
  const features = featuresDefinitionId ? group.summary[featuresDefinitionId] : null;
  const featuresSummary = features ? flattenSummaryGroups(features) : null;
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
  const projectLink = `/${group.collection}/${group.project}/${filterQS}`;
  const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

  const renderUserStoryMetric = renderGroupItem(projectLink);
  const renderFeatureMetric = renderGroupItem(portfolioProjectLink);

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-lg h-full shadow mt-4">
      <h1 className="text-xl font-semibold mb-5 flex items-center">Flow Metrics</h1>

      <div className="grid grid-cols-7 gap-y-4">
        <div />
        <div
          className="text-xs font-semibold"
          data-tip="Number of work items completed in the last 30 days"
        >
          Velocity
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Average time taken to complete a work item over the last 30 days"
        >
          Cycle time
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Average time taken to take a work item to production after development is complete"
        >
          CLT
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Number of work items in progress"
        >
          WIP count
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Average age of work items in progress"
        >
          WIP age
        </div>
        <div />

        {
          featuresSummary ? (
            <>
              <div className="font-semibold text-sm flex items-center">
                { featuresDefinitionId ? (
                  <img
                    src={workItemTypes[featuresDefinitionId].icon}
                    alt="Features"
                    className="w-4 h-4 mr-2"
                  />
                )
                  : null}
                <span>Features</span>
              </div>
              <div className="font-semibold text-xl">
                {renderFeatureMetric(`${featuresSummary.velocity}`, '#velocity')}
              </div>
              <div className="font-semibold text-xl">
                {renderFeatureMetric(featuresSummary.cycleTime ? prettyMS(featuresSummary.cycleTime) : '-', '#cycle-time')}
              </div>
              <div className="font-semibold text-xl">
                {renderFeatureMetric(featuresSummary.changeLeadTime ? prettyMS(featuresSummary.changeLeadTime) : '-', '#change-lead-time')}
              </div>
              <div className="font-semibold text-xl">
                {renderFeatureMetric(`${featuresSummary.wipCount}`, '#age-of-work-in-progress-features-by-state')}
              </div>
              <div className="font-semibold text-xl">
                {renderFeatureMetric(featuresSummary.wipAge ? prettyMS(featuresSummary.wipAge) : '-', '#age-of-work-in-progress-items')}
              </div>
              <div />
            </>
          ) : null
        }
        {
          userStoriesSummary ? (
            <>
              <div className="font-semibold text-sm flex items-center">
                { userStoryDefinitionId ? (
                  <img
                    src={workItemTypes[userStoryDefinitionId].icon}
                    alt="User Stories"
                    className="w-4 h-4 mr-2"
                  />
                )
                  : null}
                <span>User Stories</span>
              </div>
              <div className="font-semibold text-xl">
                {renderUserStoryMetric(`${userStoriesSummary.velocity}`, '#velocity')}
              </div>
              <div className="font-semibold text-xl">
                {renderUserStoryMetric(userStoriesSummary.cycleTime ? prettyMS(userStoriesSummary.cycleTime) : '-', '#cycle-time')}
              </div>
              <div className="font-semibold text-xl">
                {renderUserStoryMetric(
                  userStoriesSummary.changeLeadTime ? prettyMS(userStoriesSummary.changeLeadTime) : '-', '#change-lead-time'
                )}
              </div>
              <div className="font-semibold text-xl">
                {renderUserStoryMetric(`${userStoriesSummary.wipCount}`, '#age-of-work-in-progress-user-stories-by-state')}
              </div>
              <div className="font-semibold text-xl">
                {renderUserStoryMetric(userStoriesSummary.wipAge
                  ? prettyMS(userStoriesSummary.wipAge) : '-', '#age-of-work-in-progress-items')}
              </div>
              <div />
            </>
          ) : null
        }
      </div>
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
      <div className="grid grid-cols-7 gap-y-4">
        <div />
        <div
          className="text-xs font-semibold"
          data-tip="Number of bugs opened in the last 30 days"
        >
          New bugs
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Number of bugs closed in the last 30 days"
        >
          Bugs fixed
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Average time taken to close a bug"
        >
          Bugs cycle time
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Average time taken to close a bug once development is complete"
        >
          Bugs CLT
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Number of work-in-progress bugs"
        >
          WIP
        </div>
        <div
          className="text-xs font-semibold"
          data-tip="Average age of work-in-progress bugs"
        >
          WIP age
        </div>

        {
          Object.entries(bugs).map(([environment, envBasedBugInfo]) => {
            const bugInfo = processSummary(envBasedBugInfo);

            return (
              <Fragment key={environment}>
                <div className="font-semibold text-sm">{environment}</div>
                <div className="font-semibold text-xl">{renderBugMetric(`${bugInfo.leakage}`, '#bug-leakage-with-root-cause')}</div>
                <div className="font-semibold text-xl">{renderBugMetric(`${bugInfo.velocity}`, '#velocity')}</div>
                <div className="font-semibold text-xl">
                  {renderBugMetric(bugInfo.cycleTime ? prettyMS(bugInfo.cycleTime) : '-', '#cycle-time')}
                </div>
                <div className="font-semibold text-xl">
                  {renderBugMetric(bugInfo.changeLeadTime ? prettyMS(bugInfo.changeLeadTime) : '-', '#change-lead-time')}
                </div>
                <div className="font-semibold text-xl">
                  {renderBugMetric(`${bugInfo.wipCount}`, '#work-in-progress-trend')}
                </div>
                <div className="font-semibold text-xl">
                  {renderBugMetric(bugInfo.wipAge ? prettyMS(bugInfo.wipAge) : '-', '#age-of-work-in-progress-items')}
                </div>
              </Fragment>
            );
          })
        }
      </div>
    </div>
  );
};

const HealthMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
}> = ({ group }) => {
  const { repoStats, pipelineStats } = group;
  const { codeQuality } = repoStats;
  const codeQualityNumConfigured = sum(Object.values(codeQuality));
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
  const baseProjectLink = `/${group.collection}/${group.project}`;
  const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
  const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

  return (
    <>
      <h2 className="text-xs uppercase mt-8 ml-1 font-semibold">
        Health metrics
      </h2>
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

            <div className="font-semibold text-xl">{reposMetric(num(repoStats.tests))}</div>
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
                Sonar
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
                data-tip={`${codeQualityNumConfigured} of ${repoStats.repos} repos have SonarQube configured`}
              >
                {repoStats.repos ? reposMetric(`${((codeQualityNumConfigured / repoStats.repos) * 100).toFixed(0)}%`) : '-'}
              </div>
              <div
                className="font-semibold text-md"
                data-tip={`${codeQuality.pass} of ${codeQualityNumConfigured} repos with 'Ok' quality gate`}
              >
                {codeQualityNumConfigured ? `${((codeQuality.pass / codeQualityNumConfigured) * 100).toFixed(0)}%` : '-'}
              </div>
              <div
                className="font-semibold text-md"
                data-tip={`${codeQuality.warn} of ${codeQualityNumConfigured} repos with 'Warn' quality gate`}
              >
                {codeQualityNumConfigured ? `${((codeQuality.warn / codeQualityNumConfigured) * 100).toFixed(0)}%` : '-'}
              </div>
              <div
                className="font-semibold text-md"
                data-tip={`${codeQuality.fail} of ${codeQualityNumConfigured} repos with 'Error' quality gate`}
              >
                {codeQualityNumConfigured ? `${((codeQuality.fail / codeQualityNumConfigured) * 100).toFixed(0)}%` : '-'}
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
                  : `${Math.round((pipelineStats.masterOnlyPipelines * 100) / pipelineStats.pipelines)}%`
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

const SummaryItem: React.FC<SummaryItemProps> = ({ group, workItemTypes }) => (
  <>
    <details>
      <summary className="text-2xl font-bold group cursor-pointer" id={`${group.groupName}`}>
        <span>{group.groupName}</span>
        {/* <span className="opacity-0 ml-2 group-hover:opacity-20">#</span> */}
      </summary>

      <h2 className="text-xs uppercase mt-8 ml-1 font-semibold">
        Value metrics
      </h2>
      <FlowMetrics group={group} workItemTypes={workItemTypes} />
      <QualityMetrics group={group} workItemTypes={workItemTypes} />
      <HealthMetrics group={group} />
    </details>
  </>
);

const SummaryByTeam: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ groups, workItemTypes }) => (
  <ul className="bg-gray-50 p-8 rounded-lg">
    {
      groups
        .map(group => (
          <li key={group.groupName} className="mb-8">
            <SummaryItem
              group={group}
              workItemTypes={workItemTypes}
            />
          </li>
        ))

    }
  </ul>
);

export default SummaryByTeam;
