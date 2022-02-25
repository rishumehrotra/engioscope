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

const renderGroupItem = (link: string) => (label: string, anchor: string) => (
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

const SummaryItem: React.FC<SummaryItemProps> = ({ group, workItemTypes }) => {
  const [filterKey] = allExceptExpectedKeys(group);
  const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
  const bugs = bugsDefinitionId ? group.summary[bugsDefinitionId] : null;
  const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
  const baseProjectLink = `/${group.collection}/${group.project}`;
  const projectLink = `/${group.collection}/${group.project}/${filterQS}`;
  const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;
  const { repoStats, pipelineStats } = group;
  const { codeQuality } = repoStats;
  const codeQualityNumConfigured = sum(Object.values(codeQuality));

  return (
    <>
      <div className="text-2xl font-bold">{group.groupName}</div>
      <div className="grid grid-flow-row gap-4 grid-col-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr mt-4">
        {
          Object.entries(group.summary)
            .filter(([key]) => workItemTypes[key].name[0] !== 'Bug')
            .map(([typeId, summaryGroups]) => {
              const workItemType = workItemTypes[typeId];
              const { icon } = workItemType;
              const isUserStory = workItemType.name[0] === 'User Story';
              const summary = flattenSummaryGroups(summaryGroups);
              const renderGroupItemWithLink = renderGroupItem(isUserStory ? projectLink : portfolioProjectLink);

              return (
                <div key={typeId} className="flex flex-col justify-center p-6 bg-white border border-gray-100 rounded-lg h-full shadow">
                  <h1 className="text-lg font-semibold mb-5 flex items-center">
                    <img src={icon} alt={typeId} className="w-4 h-4 mr-2" />
                    <span>{workItemType.name[1]}</span>
                  </h1>
                  <div className="grid grid-cols-3 gap-y-4">
                    <div>
                      <div className="text-xs font-medium">Velocity</div>
                      {renderGroupItemWithLink(`${summary.velocity}`, '#velocity')}
                    </div>
                    <div>
                      <div className="text-xs font-medium">Cycle time</div>
                      {renderGroupItemWithLink(summary.cycleTime ? prettyMS(summary.cycleTime) : '-', '#cycle-time')}
                    </div>
                    <div>
                      <div className="text-xs font-medium">Change lead time</div>
                      {renderGroupItemWithLink(summary.changeLeadTime ? prettyMS(summary.changeLeadTime) : '-', '#change-lead-time')}
                    </div>
                    <div>
                      <div className="text-xs font-medium">WIP count</div>
                      {renderGroupItemWithLink(
                        `${summary.wipCount}`,
                        isUserStory ? '#age-of-work-in-progress-user-stories-by-state' : '#age-of-work-in-progress-features-by-state'
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium">WIP age</div>
                      {renderGroupItemWithLink(summary.wipAge ? prettyMS(summary.wipAge) : '-', '#age-of-work-in-progress-items')}
                    </div>
                  </div>
                </div>
              );
            })
        }
        <div className="flex flex-col p-6 h-full bg-blue-50 border border-blue-300 rounded-lg shadow group">
          <a
            href={`${baseProjectLink}/repos${filterQS}`}
            className="text-blue-500 flex"
            target="_blank"
            rel="noreferrer"
          >
            <h1 className="text-lg font-semibold mb-5 flex items-center">
              <span className="text-black">Repos</span>
              <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
            </h1>
          </a>
          <div className="grid grid-cols-4 gap-y-4">
            <div className="flex flex-col">
              <h3 className="text-xs font-medium">Tests</h3>
              <div className="font-semibold text-xl">{num(repoStats.tests)}</div>
            </div>
            <div />
            <div className="flex flex-col">
              <h3 className="text-xs font-medium">Builds</h3>
              <div className="font-semibold text-xl">{num(repoStats.builds.total)}</div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-xs font-medium">Success</h3>
              <div className="font-semibold text-xl">
                {((repoStats.builds.successful / repoStats.builds.total) * 100).toFixed(0)}
                %
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <h3 className="text-xs font-medium">Sonar</h3>
              <div className="font-semibold text-xl text-black">
                {((codeQualityNumConfigured / repoStats.repos) * 100).toFixed(0)}
                %
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <h3 className="text-xs font-medium">Ok</h3>
              <div className="font-semibold text-xl text-black">
                {((codeQuality.pass / codeQualityNumConfigured) * 100).toFixed(0)}
                %
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <h3 className="text-xs font-medium">Warn</h3>
              <div className="font-semibold text-xl text-black">
                {((codeQuality.warn / codeQualityNumConfigured) * 100).toFixed(0)}
                %
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <h3 className="text-xs font-medium">Fail</h3>
              <div className="font-semibold text-xl text-black">
                {((codeQuality.fail / codeQualityNumConfigured) * 100).toFixed(0)}
                %
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col p-6 h-full bg-blue-50 border border-blue-300 rounded-lg shadow group">
          <a
            href={`${baseProjectLink}/release-pipelines${filterQS}`}
            className="text-blue-500 flex"
            target="_blank"
            rel="noreferrer"
          >
            <h1 className="text-lg font-semibold mb-5 flex items-center">
              <span className="text-black">Release pipelines</span>
              <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
            </h1>
          </a>
          <div className="grid grid-cols-2 gap-y-4">
            {
              pipelineStats.stages.map(stage => (
                <Fragment key={stage.name}>
                  <div className="flex flex-col justify-end">
                    <h3 className="text-xs font-medium">
                      {stage.name}
                      : Exists
                    </h3>
                    <div className="font-semibold text-xl">
                      {pipelineStats.pipelines === 0 ? '0' : `${Math.round((stage.exists * 100) / pipelineStats.pipelines)}%`}
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <h3 className="text-xs font-medium">
                      {stage.name}
                      : Used
                    </h3>
                    <div className="font-semibold text-xl">
                      {pipelineStats.pipelines === 0 ? '0' : `${Math.round((stage.used * 100) / pipelineStats.pipelines)}%`}
                    </div>
                  </div>
                </Fragment>
              ))
            }
            <div className="flex flex-col justify-end">
              <h3 className="text-xs font-medium">
                Master-only pipelines
              </h3>
              <div className="font-semibold text-xl">
                {pipelineStats.pipelines === 0 ? '0'
                  : `${Math.round((pipelineStats.masterOnlyPipelines * 100) / pipelineStats.pipelines)}%`}
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <h3 className="text-xs font-medium">
                Conforms to branch policies
              </h3>
              <div className="font-semibold text-xl">
                {pipelineStats.pipelines === 0 ? '0'
                  : `${Math.round((pipelineStats.conformsToBranchPolicies * 100) / pipelineStats.pipelines)}%`}
              </div>
            </div>
          </div>
        </div>
      </div>
      {bugs ? (
        <div className="grid grid-flow-row gap-8 grid-col-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr mt-4 mb-8">
          {
            Object.entries(bugs).map(([environment, envBasedBugInfo]) => {
              const bugInfo = processSummary(envBasedBugInfo);
              const renderGroupItemWithLink = renderGroupItem(portfolioProjectLink);
              const icon = bugsDefinitionId ? workItemTypes[bugsDefinitionId].icon : null;

              return (
                <div
                  key={environment}
                  className="flex flex-col justify-center p-6 bg-white border border-gray-100 rounded-lg h-full shadow"
                >
                  <h1 className="text-lg font-semibold mb-5 flex items-center">
                    { icon ? <img src={icon} alt="Bugs" className="w-4 h-4 mr-2" /> : null }
                    <span>{`Bugs-${environment}`}</span>
                  </h1>
                  <div className="grid grid-cols-3">
                    <div className="text-xs font-medium">Velocity</div>
                    <div className="text-xs font-medium">Cycle time</div>
                    <div className="text-xs font-medium">Change lead time</div>
                    {renderGroupItemWithLink(`${bugInfo.velocity}`, '#velocity')}
                    {renderGroupItemWithLink(bugInfo.cycleTime ? prettyMS(bugInfo.cycleTime) : '-', '#cycle-time')}
                    {renderGroupItemWithLink(bugInfo.changeLeadTime ? prettyMS(bugInfo.changeLeadTime) : '-', '#change-lead-time')}
                  </div>
                  <div className="grid grid-cols-3 mt-4">
                    <div className="text-xs font-medium">WIP count</div>
                    <div className="text-xs font-medium">WIP age</div>
                    <div className="text-xs font-medium">Leakage</div>
                    {renderGroupItemWithLink(`${bugInfo.wipCount}`, '#work-in-progress-trend')}
                    {renderGroupItemWithLink(bugInfo.wipAge ? prettyMS(bugInfo.wipAge) : '-', '#age-of-work-in-progress-items')}
                    {renderGroupItemWithLink(`${bugInfo.leakage}`, '#bug-leakage-with-root-cause')}
                  </div>
                </div>
              );
            })
          }
        </div>
      ) : null}
    </>
  );
};

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

      <div className="mx-32 px-8 mt-8 flex justify-end">
        <div className="w-64">
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
