import { sum } from 'rambda';
import React, { Fragment } from 'react';
import type { SummaryMetrics } from '../../../shared/types';
import { num, prettyMS } from '../../helpers/utils';
import type { SummaryGroupKey } from './utils';
import {
  processSummary,
  flattenSummaryGroups, getMetricCategoryDefinitionId, allExceptExpectedKeys,
  renderGroupItem
} from './utils';

const FlowMetricsByWorkItemType: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
  workItemTypeName: string;
}> = ({ groups, workItemTypes, workItemTypeName }) => (
  <details>
    <summary className="font-semibold">{workItemTypeName}</summary>

    <div className="grid">
      <div className="grid grid-cols-6">
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
      </div>
      {groups.map(group => {
        const wiDefinitionId = getMetricCategoryDefinitionId(workItemTypes, workItemTypeName);
        const stats = wiDefinitionId ? group.summary[wiDefinitionId] : null;
        const summary = stats ? flattenSummaryGroups(stats) : null;
        const [filterKey] = allExceptExpectedKeys(group);
        const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
        const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

        const renderMetric = renderGroupItem(portfolioProjectLink);

        if (!summary) return null;

        return (
          <div key={group.groupName} className="grid grid-cols-6">
            <div>{group.groupName}</div>
            <div>{renderMetric(`${summary.velocity}`, '#velocity')}</div>
            <div>{renderMetric(summary.cycleTime ? prettyMS(summary.cycleTime) : '-', '#cycle-time')}</div>
            <div>
              {renderMetric(summary.changeLeadTime ? prettyMS(summary.changeLeadTime) : '-', '#change-lead-time')}
            </div>
            <div>
              {renderMetric(`${summary.wipCount}`, '#age-of-work-in-progress-features-by-state')}
            </div>
            <div>
              {renderMetric(summary.wipAge ? prettyMS(summary.wipAge) : '-', '#age-of-work-in-progress-items')}
            </div>
          </div>
        );
      })}
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
            <summary>{`Quality metrics - ${envDisplayName}`}</summary>

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
            </div>
            {groups.map(group => {
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
                <div className="grid grid-cols-7 gap-y-4">
                  <div className="font-semibold">{group.groupName}</div>
                  <div>{renderBugMetric(bugsForEnv ? `${bugsForEnv.leakage}` : '-', '#bugs')}</div>
                  <div>{renderBugMetric(bugsForEnv ? `${bugsForEnv.velocity}` : '-', '#velocity')}</div>
                  <div>{renderBugMetric(bugsForEnv?.cycleTime ? prettyMS(bugsForEnv.cycleTime) : '-', '#cycle-time')}</div>
                  <div>
                    {renderBugMetric(bugsForEnv?.changeLeadTime ? prettyMS(bugsForEnv.changeLeadTime) : '-', '#change-lead-time')}
                  </div>
                  <div>{renderBugMetric(bugsForEnv ? `${bugsForEnv.wipCount}` : '-', '#work-in-progress-trend')}</div>
                  <div>{renderBugMetric(bugsForEnv?.wipAge ? prettyMS(bugsForEnv.wipAge) : '-', '#age-of-work-in-progress-items')}</div>
                </div>
              );
            })}
          </details>
        );
      })}
    </>
  );
};

const TestAutomationMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <>
    {groups.map(group => {
      const { repoStats, pipelineStats } = group;
      const [filterKey] = allExceptExpectedKeys(group);
      const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
      const baseProjectLink = `/${group.collection}/${group.project}`;
      const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
      const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

      return (
        <div className="grid grid-cols-4">
          <div>
            {group.groupName}
          </div>
          <div>
            {reposMetric(num(repoStats.tests))}
          </div>
          <div>
            Coming soon
          </div>
          {
            pipelineStats.stages.map(stage => (
              <div key={stage.name}>
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
              </div>
            ))
          }

        </div>
      );
    })}
  </>
);

const CodeQualityMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => (
  <>
    {groups.map(group => {
      const { repoStats, pipelineStats } = group;
      const { codeQuality } = repoStats;
      const codeQualityNumConfigured = sum(Object.values(codeQuality));
      const [filterKey] = allExceptExpectedKeys(group);
      const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
      const baseProjectLink = `/${group.collection}/${group.project}`;
      const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

      return (
        <div className="grid grid-cols-6">
          <div>
            {group.groupName}
          </div>
          <div>
            {((codeQualityNumConfigured / repoStats.repos) * 100).toFixed(0)}
          </div>
          <div>
            {codeQualityNumConfigured ? `${((codeQuality.pass / codeQualityNumConfigured) * 100).toFixed(0)}%` : '-'}
          </div>
          <div>
            {codeQualityNumConfigured ? `${((codeQuality.warn / codeQualityNumConfigured) * 100).toFixed(0)}%` : '-'}
          </div>
          <div>
            {codeQualityNumConfigured ? `${((codeQuality.fail / codeQualityNumConfigured) * 100).toFixed(0)}%` : '-'}
          </div>
          <div>
            {
              pipelinesMetric(
                pipelineStats.pipelines === 0 ? '0'
                  : `${Math.round((pipelineStats.conformsToBranchPolicies * 100) / pipelineStats.pipelines)}%`
              )
            }
          </div>
        </div>
      );
    })}
  </>
);

const SummaryByMetric: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ groups, workItemTypes }) => (
  <div>
    Flow metrics

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

    Quality metrics
    <QualityMetrics groups={groups} workItemTypes={workItemTypes} />

    Health metrics
    <TestAutomationMetrics groups={groups} />
    <CodeQualityMetrics groups={groups} />
  </div>
);

export default SummaryByMetric;
