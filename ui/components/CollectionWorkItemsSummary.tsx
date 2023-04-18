import React from 'react';

import type { RouterClient } from '../helpers/trpc.js';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils';
import type { UIWorkItemType } from '../../shared/types.js';
import { num, prettyMS } from '../helpers/utils.js';

type ProjectWorkItemSummaryForType =
  RouterClient['summary']['collectionWorkItemsSummary']['projects'][number]['byType'][string];

type ProjectWorkItemSummary = ProjectWorkItemSummaryForType[string];

const FlowMetricsTableHeader: React.FC<{
  queryPeriodDays: number;
}> = ({ queryPeriodDays }) => {
  return (
    <thead>
      <tr>
        <th className="left">Project</th>
        <th
          data-tip={`Number of new work items added in the last ${queryPeriodDays} days`}
        >
          New
        </th>
        <th
          data-tip={`Number of work items completed in the last ${queryPeriodDays} days`}
        >
          Velocity
        </th>
        <th
          data-tip={`Average time taken to complete a work item over the last ${queryPeriodDays} days`}
        >
          Cycle time
        </th>
        <th data-tip="Average time taken to take a work item to production after development is complete">
          CLT
        </th>
        <th data-tip="Fraction of overall time that work items spend in work centers on average">
          Flow efficiency
        </th>
        <th data-tip={`WIP items over the last ${queryPeriodDays} days`}>WIP trend</th>
        <th data-tip="Average age of work items in progress">WIP age</th>
      </tr>
    </thead>
  );
};

const QualityMetricsTableHeader: React.FC<{
  queryPeriodDays: number;
}> = ({ queryPeriodDays }) => {
  return (
    <thead>
      <tr>
        <th>Project</th>
        <th data-tip={`Number of bugs opened in the last ${queryPeriodDays} days`}>
          New
        </th>
        <th data-tip={`Number of bugs closed in the last ${queryPeriodDays} days`}>
          Fixed
        </th>
        <th data-tip="Average time taken to close a bug">Cycle time</th>
        <th data-tip="Average time taken to close a bug once development is complete">
          CLT
        </th>
        <th data-tip="Fraction of overall time that work items spend in work centers on average">
          Flow efficiency
        </th>
        <th data-tip={`WIP items over the last ${queryPeriodDays} days`}>WIP trend</th>
        <th data-tip="Average age of work-in-progress bugs">WIP age</th>
      </tr>
    </thead>
  );
};

const FlowMetricsRow: React.FC<{
  projectName: string;
  summary: ProjectWorkItemSummary;
}> = ({ projectName, summary }) => {
  return (
    <tr key={projectName}>
      <td className="left">{projectName}</td>
      {/* New */}
      <td>{num(summary.count)}</td>
      {/* Velocity */}
      <td>{num(summary.velocity)}</td>
      {/* Cycle time */}
      <td>
        {divide(summary.cycleTime.count, summary.cycleTime.wis).map(prettyMS).getOr('-')}
      </td>
      {/* CLT */}
      <td>
        {divide(summary.changeLeadTime.count, summary.changeLeadTime.wis)
          .map(prettyMS)
          .getOr('-')}
      </td>
      {/* Flow Efficiency */}
      <td>
        {divide(summary.flowEfficiency.wcTime, summary.flowEfficiency.total)
          .map(toPercentage)
          .getOr('-')}
      </td>
      {/* WIP trend */}
      <td>{summary.wipTrend}</td>
      {/* WIP age */}
      <td>{divide(summary.wipAge.count, summary.wipAge.wis).map(prettyMS).getOr('-')}</td>
    </tr>
  );
};

const aggregateAcrossGroups = (typeSummary: ProjectWorkItemSummaryForType) => {
  return Object.values(typeSummary).reduce<ProjectWorkItemSummary>(
    (acc, groupSummary) => ({
      count: acc.count + groupSummary.count || 0,
      velocity: acc.velocity + groupSummary.velocity || 0,
      velocityByWeek: [],
      cycleTime: {
        count: acc.cycleTime.count + groupSummary.cycleTime.count || 0,
        wis: acc.cycleTime.wis + groupSummary.cycleTime.wis || 0,
      },
      cycleTimeByWeek: [],
      changeLeadTime: {
        count: acc.changeLeadTime.count + groupSummary.changeLeadTime.count || 0,
        wis: acc.changeLeadTime.wis + groupSummary.changeLeadTime.wis || 0,
      },
      changeLeadTimeByWeek: [],
      flowEfficiency: {
        total: acc.flowEfficiency.total + groupSummary.flowEfficiency.total || 0,
        wcTime: acc.flowEfficiency.wcTime + groupSummary.flowEfficiency.wcTime || 0,
      },
      flowEfficiencyByWeek: [],
      wipTrend: [],
      wipCount: acc.wipCount + groupSummary.wipCount || 0,
      wipAge: {
        count: acc.wipAge.count + groupSummary.wipAge.count || 0,
        wis: acc.wipAge.wis + groupSummary.wipAge.wis || 0,
      },
      leakage: acc.leakage + groupSummary.leakage || 0,
      leakageByWeek: [],
    }),
    {
      count: 0,
      velocity: 0,
      velocityByWeek: [],
      cycleTime: { count: 0, wis: 0 },
      cycleTimeByWeek: [],
      changeLeadTime: { count: 0, wis: 0 },
      changeLeadTimeByWeek: [],
      flowEfficiency: { total: 0, wcTime: 0 },
      flowEfficiencyByWeek: [],
      wipTrend: [],
      wipCount: 0,
      wipAge: { count: 0, wis: 0 },
      leakage: 0,
      leakageByWeek: [],
    }
  );
};

const witByName = (name: string, types: Record<string, UIWorkItemType>) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [witId, type] = Object.entries(types).find(([, wit]) => wit.name[0] === name)!;
  return { ...type, witId };
};

const CollectionWorkItemsSummary: React.FC<{
  collectionName: string;
}> = ({ collectionName }) => {
  const workItems = trpc.summary.collectionWorkItemsSummary.useQuery({
    collectionName,
  });

  if (!workItems.data?.projects.length) {
    return <div>Sorry No Projects Found</div>;
  }

  const summaries = ['Feature', 'User Story'].map(witName => {
    const type = witByName(witName, workItems.data.types);

    return {
      type,
      projects: workItems.data.projects.map(p => ({
        name: p.project,
        data: aggregateAcrossGroups(p.byType[type.witId] || {}),
      })),
    };
  });

  return (
    <div>
      <h2 className="font-semibold text-2xl my-2">Flow Metrics</h2>
      {summaries.map(summary => {
        return (
          <details key={summary.type.name[0]}>
            <summary className="font-semibold text-xl my-2 cursor-pointer">
              <img
                src={summary.type.icon}
                alt={`Icon for ${summary.type.name[1]}`}
                className="inline-block mr-1"
                width="18"
              />
              {summary.type.name[1]}
            </summary>
            <div>
              <table className="summary-table">
                <FlowMetricsTableHeader queryPeriodDays={90} />
                <tbody>
                  {summary.projects.map(project => (
                    <FlowMetricsRow
                      key={project.name}
                      projectName={project.name}
                      summary={project.data}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}

      <h2 className="font-semibold text-2xl my-2">Quality Metrics</h2>
      {Object.entries(workItems.data.types)
        .filter(([, value]) => value.name[1] === 'Bugs')
        .map(([key, value]) => {
          return (
            <details key={key}>
              <summary className="font-semibold text-xl my-2 cursor-pointer">
                <img
                  src={value.icon}
                  alt={`Icon for ${value.name[1]}`}
                  className="inline-block mr-1"
                  width="18"
                />
                {value.name[1]}
              </summary>
              <div>
                <table className="summary-table">
                  <QualityMetricsTableHeader queryPeriodDays={90} />

                  <tbody />
                </table>
              </div>
            </details>
          );
        })}
    </div>
  );
};

export default CollectionWorkItemsSummary;
