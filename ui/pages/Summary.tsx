import { sum } from 'rambda';
import React, { Fragment, useEffect, useState } from 'react';
import { useQueryParam } from 'use-query-params';
import type { SummaryMetrics } from '../../shared/types';
import { ExternalLink } from '../components/common/Icons';
import SearchInput from '../components/common/SearchInput';
import Header from '../components/Header';
import Loading from '../components/Loading';
import {
  dontFilter, filterBySearch, num, prettyMS
} from '../helpers/utils';
import { metricsSummary } from '../network';

type SummaryGroups = SummaryMetrics['groups'][number]['summary'][string];

type ProcessedSummary = {
  count: number;
  velocity: number;
  cycleTime: number;
  changeLeadTime: number;
  wipCount: number;
  wipAge: number;
  leakage: number;
};

const processSummary = (summary: SummaryGroups[string]): ProcessedSummary => ({
  count: summary.count,
  velocity: summary.velocity,
  cycleTime: sum(summary.cycleTime) / summary.velocity,
  changeLeadTime: sum(summary.changeLeadTime) / summary.velocity,
  wipCount: summary.wipCount,
  wipAge: sum(summary.wipAge) / summary.wipCount,
  leakage: summary.leakage
});

const flattenSummaryGroups = (summaryGroups: SummaryGroups) => {
  type IntermediateFlattenedGroups = {
    count: number;
    velocity: number;
    cycleTime: number[];
    changeLeadTime: number[];
    wipCount: number;
    wipAge: number[];
    leakage: number;
  };

  const merged = Object.values(summaryGroups).reduce<IntermediateFlattenedGroups>((acc, group) => ({
    velocity: acc.velocity + group.velocity,
    changeLeadTime: [...acc.changeLeadTime, ...group.changeLeadTime],
    cycleTime: [...acc.cycleTime, ...group.cycleTime],
    wipCount: acc.wipCount + group.wipCount,
    wipAge: [...acc.wipAge, ...group.wipAge],
    count: acc.count + group.count,
    leakage: acc.leakage + group.leakage
  }), {
    count: 0,
    velocity: 0,
    cycleTime: [],
    changeLeadTime: [],
    wipCount: 0,
    wipAge: [],
    leakage: 0
  });

  return processSummary(merged);
};

type SummaryItemProps = {
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
};

const getMetricCategoryDefinitionId = (
  workItemTypes: SummaryMetrics['workItemTypes'],
  field: string
) => Object.entries(workItemTypes).find(([, { name }]) => name[0] === field)?.[0];

const renderGroupItem = (link: string) => (label: string, anchor = '') => (
  <div className="group flex items-center">
    <a
      href={`${link}${anchor}`}
      className="text-blue-500 flex"
      target="_blank"
      rel="noreferrer"
    >
      <span className="font-semibold text-xl text-black">{label}</span>
      <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
    </a>
  </div>
);

type SummaryGroupKey = keyof SummaryItemProps['group'];

const allExceptExpectedKeys = (group: SummaryItemProps['group']) => {
  const expectedKeys: SummaryGroupKey[] = ['collection', 'groupName', 'portfolioProject', 'project', 'summary'];
  return Object.keys(group).filter(k => !expectedKeys.includes(k as SummaryGroupKey));
};

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
        <div className="text-xs font-semibold">Velocity</div>
        <div className="text-xs font-semibold">Cycle time</div>
        <div className="text-xs font-semibold">CLT</div>
        <div className="text-xs font-semibold">WIP count</div>
        <div className="text-xs font-semibold">WIP age</div>
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

const ReliabilityMetrics: React.FC<{
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
}> = ({ group, workItemTypes }) => {
  const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
  const bugs = bugsDefinitionId ? group.summary[bugsDefinitionId] : null;
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
  const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;
  const renderBugMetric = renderGroupItem(portfolioProjectLink);

  return (
    bugs
      ? (
        <div className="p-6 bg-white border border-gray-100 rounded-lg h-full shadow mt-4">
          <h1 className="text-xl font-semibold mb-5 flex items-center">Reliability Metrics</h1>
          <div className="grid grid-cols-7 gap-y-4">
            <div />
            <div className="text-xs font-semibold">New bugs</div>
            <div className="text-xs font-semibold">Bugs fixed</div>
            <div className="text-xs font-semibold">Bugs cycle time</div>
            <div className="text-xs font-semibold">Bugs CLT</div>
            <div className="text-xs font-semibold">WIP</div>
            <div className="text-xs font-semibold">WIP age</div>

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
      )
      : null);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
      <div className="p-6 h-full bg-blue-50 border border-blue-200 rounded-lg shadow">
        <div className="text-lg font-semibold mb-5 flex items-center">Test Automation</div>
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          <div className="text-xs font-semibold">Tests</div>
          <div className="text-xs font-semibold">Coverage</div>
          {
            pipelineStats.stages.map(stage => (
              <Fragment key={stage.name}>
                <div className="text-xs font-semibold">
                  {`Pipelines having ${stage.name}`}
                </div>
                <div className="text-xs font-semibold">
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

      <div className="p-6 h-full bg-blue-50 border border-blue-200 rounded-lg shadow">
        <div className="text-lg font-semibold mb-5 flex items-center">Code Quality</div>
        <div className="grid grid-cols-6 gap-x-1">
          <div className="col-span-6 grid grid-cols-6 gap-y-4">
            <div className="text-xs font-semibold">Sonar</div>
            <div className="text-xs font-semibold">Ok</div>
            <div className="text-xs font-semibold">Warn</div>
            <div className="text-xs font-semibold">Fail</div>
            <div />
            <div className="text-xs font-semibold">Branch policy met</div>

            <div
              className="font-semibold text-xl"
              data-tip={`${codeQualityNumConfigured} of ${repoStats.repos} repos have SonarQube configured`}
            >
              {((codeQualityNumConfigured / repoStats.repos) * 100).toFixed(0)}
              %
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
              {
                pipelinesMetric(
                  pipelineStats.pipelines === 0 ? '0'
                    : `${Math.round((pipelineStats.conformsToBranchPolicies * 100) / pipelineStats.pipelines)}%`
                )
              }
            </div>
          </div>

        </div>
      </div>

      <div className="p-6 h-full bg-blue-50 border border-blue-200 rounded-lg shadow">
        <div className="text-lg font-semibold mb-5 flex items-center">CI-CD</div>
        <div className="grid grid-cols-4 gap-y-4">
          <div className="text-xs font-semibold">Builds</div>
          <div className="text-xs font-semibold">Success</div>
          <div />
          <div className="text-xs font-semibold">Master only pipelines</div>

          <div className="font-semibold text-xl">{reposMetric(num(repoStats.builds.total))}</div>
          <div className="font-semibold text-xl">
            {reposMetric(
              `${((repoStats.builds.successful * 100) / repoStats.builds.total).toFixed(0)}%`
            )}
          </div>
          <div />
          <div className="font-semibold text-xl">
            {
              pipelinesMetric(
                pipelineStats.pipelines === 0 ? '0'
                  : `${Math.round((pipelineStats.masterOnlyPipelines * 100) / pipelineStats.pipelines)}%`
              )
            }
          </div>
        </div>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg h-full shadow opacity-50">
        <div className="text-lg font-semibold mb-5 flex items-center">
          Contract driven development
          <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">coming soon</span>
        </div>
        <div className="grid grid-cols-3 gap-y-4 gap-x-2">
          <div className="text-xs font-semibold">Contract Tests</div>
          <div className="text-xs font-semibold">Contracts used for service virtualisation</div>
          <div className="text-xs font-semibold">Orphaned contracts</div>

          <div className="font-semibold text-xl">xx</div>
          <div className="font-semibold text-xl">xx</div>
          <div className="font-semibold text-xl">xx</div>
        </div>
      </div>
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg h-full shadow opacity-50">
        <div className="text-lg font-semibold mb-5 flex items-center">
          Infrastructure
          <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">coming soon</span>
        </div>
        <div className="grid grid-cols-3 gap-y-4 gap-x-2">
          <div className="text-xs font-semibold">Pipelines creating containers</div>
          <div className="text-xs font-semibold">Pipelines publishing config files</div>
          <div className="text-xs font-semibold">Pipelines without manual steps</div>

          <div className="font-semibold text-xl">xx%</div>
          <div className="font-semibold text-xl">xx%</div>
          <div className="font-semibold text-xl">xx%</div>
        </div>
      </div>
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg h-full shadow opacity-50">
        <div className="text-lg font-semibold mb-5 flex items-center">
          Feature toggles
          <span className="bg-gray-300 uppercase text-xs ml-2 rounded-md px-2 py-1">coming soon</span>
        </div>
        <div className="grid grid-cols-3 gap-y-4 gap-x-2">
          <div className="text-xs font-semibold">Independent deployments</div>
          <div className="text-xs font-semibold">Toggled ON (Avg. age)</div>
          <div className="text-xs font-semibold">Toggled OFF (Avg. age)</div>

          <div className="font-semibold text-xl">xx</div>
          <div className="font-semibold text-xl">xx</div>
          <div className="font-semibold text-xl">xx</div>
        </div>
      </div>
    </div>
  );
};

const SummaryItem: React.FC<SummaryItemProps> = ({ group, workItemTypes }) => (
  <>
    <div className="text-2xl font-bold group" id={`${group.groupName}`}>
      <span>{group.groupName}</span>
      <span className="opacity-0 ml-2 group-hover:opacity-20">#</span>
    </div>
    <FlowMetrics group={group} workItemTypes={workItemTypes} />
    <ReliabilityMetrics group={group} workItemTypes={workItemTypes} />
    <HealthMetrics group={group} />
  </>
);

const bySearch = (search: string) => (group: SummaryMetrics['groups'][number]) => filterBySearch(search, group.groupName);

const Summary: React.FC = () => {
  const [metrics, setMetrics] = useState<SummaryMetrics | undefined>();
  useEffect(() => { metricsSummary().then(setMetrics); }, []);
  const [search] = useQueryParam<string>('search');

  return (
    <>
      <Header
        title="Metrics summary"
        lastUpdated={metrics ? new Date(metrics.lastUpdateDate) : null}
      />

      <div className="mx-32 px-8 mt-8 flex justify-between bg-gray-50">
        <div className="flex-1 flex flex-wrap">
          {
            metrics?.groups
              ? (
                <>
                  <div className="mr-4 font-semibold uppercase">Quick Nav</div>
                  {metrics.groups.map(group => (
                    <div className="mb-1" key={group.groupName}>
                      <a className="link-text" href={`#${group.groupName}`}>{group.groupName}</a>
                      <span className="mx-2 text-blue-600">·</span>
                    </div>
                  ))}
                </>
              )
              : null
          }
        </div>
        <div style={{ height: 40 }} className="ml-2 w-60">
          <SearchInput />
        </div>
      </div>

      <ul className="mx-32 bg-gray-50 p-8 rounded-lg">
        {metrics
          ? (
            metrics.groups
              .filter(search ? bySearch(search) : dontFilter)
              .map(group => (
                <li key={group.groupName} className="mb-16">
                  <SummaryItem
                    group={group}
                    workItemTypes={metrics.workItemTypes}
                  />
                </li>
              ))
          )
          : <Loading />}
      </ul>
    </>
  );
};

export default Summary;
