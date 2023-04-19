import React, { useMemo } from 'react';

import { byNum, byString } from 'sort-lib';
import { last, prop } from 'rambda';
import { useParams } from 'react-router-dom';
import type { RouterClient } from '../helpers/trpc.js';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils';
import type { UIWorkItemType } from '../../shared/types.js';
import { num, prettyMS } from '../helpers/utils.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { useTableSorter } from '../hooks/useTableSorter.jsx';

type ProjectWorkItemSummaryForType =
  RouterClient['summary']['collectionWorkItemsSummary']['projects'][number]['byType'][string];

type ProjectWorkItemSummary = ProjectWorkItemSummaryForType[string];

type ProjectWorkItemSummaryWithName = {
  name: string;
  summary: ProjectWorkItemSummary;
};

const emptySummary = {
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
};

const sorters = {
  byName: byString<ProjectWorkItemSummaryWithName>(prop('name')),
  byNew: byNum<ProjectWorkItemSummaryWithName>(x => x.summary.leakage),
  byVelocity: byNum<ProjectWorkItemSummaryWithName>(x => x.summary.velocity),
  byCycleTime: byNum<ProjectWorkItemSummaryWithName>(x =>
    divide(x.summary.cycleTime.count, x.summary.cycleTime.wis).getOr(0)
  ),
  byChangeLeadTime: byNum<ProjectWorkItemSummaryWithName>(x =>
    divide(x.summary.changeLeadTime.count, x.summary.changeLeadTime.wis).getOr(0)
  ),
  byFlowEfficiency: byNum<ProjectWorkItemSummaryWithName>(x =>
    divide(x.summary.flowEfficiency.wcTime, x.summary.flowEfficiency.total).getOr(0)
  ),
  byWipTrend: byNum<ProjectWorkItemSummaryWithName>(x => last(x.summary.wipTrend) || 0),
  byWipAge: byNum<ProjectWorkItemSummaryWithName>(x =>
    divide(x.summary.wipAge.count, x.summary.wipAge.wis).getOr(0)
  ),
};

const FlowMetricsRow: React.FC<{
  projectName: string;
  summary: ProjectWorkItemSummary;
}> = ({ projectName, summary }) => {
  const { collection } = useParams();
  return (
    <tr key={projectName}>
      <td className="left">
        <a href={`/${collection}/${projectName}`}>{projectName}</a>
      </td>
      {/* New */}
      <td>{num(summary.leakage)}</td>
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
      <td>{last(summary.wipTrend) || 0}</td>
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
    emptySummary
  );
};

const witByName = (name: string, types: Record<string, UIWorkItemType>) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [witId, type] = Object.entries(types).find(([, wit]) => wit.name[0] === name)!;
  return { ...type, witId };
};

const WorkItemTable: React.FC<{ summaries: ProjectWorkItemSummaryWithName[] }> = ({
  summaries,
}) => {
  const queryPeriodDays = useQueryPeriodDays();
  const { buttonProps, sortIcon, sorter } = useTableSorter(sorters, 'byName');

  return (
    <table className="summary-table">
      <thead>
        <tr>
          <th className="left">
            <button {...buttonProps('byName')}>{sortIcon('byName')} Project</button>
          </th>
          <th
            data-tip={`Number of new work items added in the last ${queryPeriodDays} days`}
          >
            <button {...buttonProps('byNew')}>{sortIcon('byNew')} New</button>
          </th>
          <th
            data-tip={`Number of work items completed in the last ${queryPeriodDays} days`}
          >
            <button {...buttonProps('byVelocity')}>
              {sortIcon('byVelocity')} Velocity
            </button>
          </th>
          <th
            data-tip={`Average time taken to complete a work item over the last ${queryPeriodDays} days`}
          >
            <button {...buttonProps('byCycleTime')}>
              {sortIcon('byCycleTime')} Cycle time
            </button>
          </th>
          <th data-tip="Average time taken to take a work item to production after development is complete">
            <button {...buttonProps('byChangeLeadTime')}>
              {sortIcon('byChangeLeadTime')} CLT
            </button>
          </th>
          <th data-tip="Fraction of overall time that work items spend in work centers on average">
            <button {...buttonProps('byFlowEfficiency')}>
              {sortIcon('byFlowEfficiency')} Flow efficiency
            </button>
          </th>
          <th data-tip={`WIP items over the last ${queryPeriodDays} days`}>
            <button {...buttonProps('byWipTrend')}>
              {sortIcon('byWipTrend')} WIP trend
            </button>
          </th>
          <th data-tip="Average age of work items in progress">
            <button {...buttonProps('byWipAge')}>{sortIcon('byWipAge')} WIP age</button>
          </th>
        </tr>
      </thead>

      <tbody>
        {summaries.sort(sorter).map(project => (
          <FlowMetricsRow
            key={project.name}
            projectName={project.name}
            summary={project.summary}
          />
        ))}
      </tbody>
    </table>
  );
};

const CollectionWorkItemsSummary: React.FC<{
  collectionName: string;
}> = ({ collectionName }) => {
  const workItems = trpc.summary.collectionWorkItemsSummary.useQuery({
    collectionName,
  });

  const summariesForFeaturesAndStories = useMemo(() => {
    if (!workItems.data) return;

    return ['Feature', 'User Story'].map(witName => {
      const type = witByName(witName, workItems.data.types);

      return {
        type,
        projects: workItems.data.projects.map(p => ({
          name: p.project,
          summary: aggregateAcrossGroups(p.byType[type.witId] || {}),
        })),
      };
    });
  }, [workItems.data]);

  const summariesForBugs = useMemo(() => {
    if (!workItems.data) return;

    const bugType = witByName('Bug', workItems.data.types);

    const groups = Object.entries(workItems.data.groups)
      .filter(([, group]) => {
        return group.witId === bugType.witId;
      })
      .map(([groupId, group]) => ({ ...group, groupId }));

    return {
      type: bugType,
      groups: groups.map(g => ({
        name: g.name,
        projects: workItems.data.projects.map(p => {
          return {
            name: p.project,
            summary: p.byType[bugType.witId]?.[g.groupId] || emptySummary,
          };
        }),
      })),
    };
  }, [workItems.data]);

  if (!workItems.data?.projects.length) {
    return <div>Sorry No Projects Found</div>;
  }

  return (
    <div>
      <h2 className="font-bold text-2xl my-2">Flow Metrics</h2>
      {summariesForFeaturesAndStories?.map(summary => {
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
            <WorkItemTable summaries={summary.projects} />
          </details>
        );
      })}

      <h2 className="font-bold text-2xl my-2 mt-6">Quality Metrics</h2>
      {summariesForBugs?.groups.map(group => (
        <details key={group.name}>
          <summary className="font-semibold text-xl my-2 cursor-pointer">
            <img
              src={summariesForBugs?.type.icon}
              alt={`Icon for ${group.name}`}
              className="inline-block mr-1"
              width="18"
            />
            {group.name}
          </summary>
          <WorkItemTable summaries={group.projects} />
        </details>
      ))}
    </div>
  );
};

export default CollectionWorkItemsSummary;
