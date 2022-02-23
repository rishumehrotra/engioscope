import { sum } from 'rambda';
import React, { useEffect, useState } from 'react';
import type { SummaryMetrics } from '../../shared/types';
import Card from '../components/common/ExpandingCard';
import Header from '../components/Header';
import Loading from '../components/Loading';
import { prettyMS } from '../helpers/utils';
import { metricsSummary } from '../network';

type SummaryGroups = SummaryMetrics['groups'][number]['summary'][string];

type ProcessedSummary = {
  count: number;
  velocity: number;
  cycleTime: number;
  changeLeadTime: number;
  wipCount: number;
  wipAge: number;
};

const processSummary = (summary: SummaryGroups[string]): ProcessedSummary => ({
  count: summary.count,
  velocity: summary.velocity,
  cycleTime: sum(summary.cycleTime) / summary.velocity,
  changeLeadTime: sum(summary.changeLeadTime) / summary.velocity,
  wipCount: summary.wipCount,
  wipAge: sum(summary.wipAge) / summary.wipCount
});

const flattenSummaryGroups = (summaryGroups: SummaryGroups) => {
  type IntermediateFlattenedGroups = {
    count: number;
    velocity: number;
    cycleTime: number[];
    changeLeadTime: number[];
    wipCount: number;
    wipAge: number[];
  };

  const merged = Object.values(summaryGroups).reduce<IntermediateFlattenedGroups>((acc, group) => ({
    velocity: acc.velocity + group.velocity,
    changeLeadTime: [...acc.changeLeadTime, ...group.changeLeadTime],
    cycleTime: [...acc.cycleTime, ...group.cycleTime],
    wipCount: acc.wipCount + group.wipCount,
    wipAge: [...acc.wipAge, ...group.wipAge],
    count: acc.count + group.count
  }), {
    count: 0,
    velocity: 0,
    cycleTime: [],
    changeLeadTime: [],
    wipCount: 0,
    wipAge: []
  });

  return processSummary(merged);
};

type SummaryItemProps = {
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
};

const SummaryItem: React.FC<SummaryItemProps> = ({ group, workItemTypes }) => {
  const bugsDefinitionId = Object.entries(workItemTypes).find(([, { name }]) => name[0] === 'Bug')?.[0];
  const bugs = bugsDefinitionId ? group.summary[bugsDefinitionId] : null;

  return (
    <Card title={group.groupName} isExpanded>
      <div className="grid grid-cols-3 m-6">
        {
          Object.entries(group.summary)
            .filter(([key]) => workItemTypes[key].name[0] !== 'Bug')
            .map(([typeId, summaryGroups]) => {
              const workItemType = workItemTypes[typeId];
              const summary = flattenSummaryGroups(summaryGroups);

              return (
                <div key={typeId}>
                  <h1 className="text-lg font-semibold">{workItemType.name[1]}</h1>
                  <dl>
                    <dt className="font-semibold">Velocity</dt>
                    <dd>{summary.velocity}</dd>
                    <dt className="font-semibold">Cycle time</dt>
                    <dd>{summary.cycleTime ? prettyMS(summary.cycleTime) : '-'}</dd>
                    <dt className="font-semibold">Change lead time</dt>
                    <dd>{summary.changeLeadTime ? prettyMS(summary.changeLeadTime) : '-'}</dd>
                    <dt className="font-semibold">WIP count</dt>
                    <dd>{summary.wipCount}</dd>
                    <dt className="font-semibold">WIP age</dt>
                    <dd>{summary.wipAge ? prettyMS(summary.wipAge) : '-'}</dd>
                  </dl>
                </div>
              );
            })
        }
        {bugs ? (
          <div>
            <h1 className="text-lg font-semibold">Bugs</h1>
            <div className="grid grid-cols-3">
              {Object.entries(bugs).map(([environment, envBasedBugInfo]) => {
                const bugInfo = processSummary(envBasedBugInfo);

                return (
                  <div key={environment}>
                    <h1 className="text-lg font-semibold">{environment}</h1>
                    <dl>
                      <dt className="font-semibold">Velocity</dt>
                      <dd>{bugInfo.velocity}</dd>
                      <dt className="font-semibold">Cycle time</dt>
                      <dd>{bugInfo.cycleTime ? prettyMS(bugInfo.cycleTime) : '-'}</dd>
                      <dt className="font-semibold">Change lead time</dt>
                      <dd>{bugInfo.changeLeadTime ? prettyMS(bugInfo.changeLeadTime) : '-'}</dd>
                      <dt className="font-semibold">WIP count</dt>
                      <dd>{bugInfo.wipCount}</dd>
                      <dt className="font-semibold">WIP age</dt>
                      <dd>{bugInfo.wipAge ? prettyMS(bugInfo.wipAge) : '-'}</dd>
                    </dl>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

const Summary: React.FC = () => {
  const [metrics, setMetrics] = useState<SummaryMetrics | undefined>();
  useEffect(() => { metricsSummary().then(setMetrics); }, []);

  return (
    <>
      <Header
        title="Metrics summary"
        lastUpdated={metrics ? new Date(metrics.lastUpdateDate) : null}
      />

      <ul className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
        {metrics
          ? (
            metrics.groups.map(group => (
              <li key={group.groupName}>
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
