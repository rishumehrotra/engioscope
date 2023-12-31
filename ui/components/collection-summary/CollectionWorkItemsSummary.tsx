import React, { useMemo } from 'react';
import { byNum, byString } from 'sort-lib';
import { prop } from 'rambda';
import { useParams } from 'react-router-dom';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, toPercentage } from '../../../shared/utils';
import type { UIWorkItemType } from '../../../shared/types.js';
import { num, prettyMS } from '../../helpers/utils.js';
import { useTableSorter } from '../../hooks/use-table-sorter.jsx';
import { useQueryPeriodDays } from '../../hooks/query-hooks.js';

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
  byWipCount: byNum<ProjectWorkItemSummaryWithName>(x => x.summary.wipCount || 0),
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
      <td>{summary.wipCount || 0}</td>
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
            <button {...buttonProps('byName')}>
              <span>Project</span>
              {sortIcon('byName')}
            </button>
          </th>
          <th
            data-tooltip-id="react-tooltip"
            data-tooltip-content={`Number of new work items added in the last ${queryPeriodDays} days`}
          >
            <button {...buttonProps('byNew')}>
              <span>New</span>
              {sortIcon('byNew')}
            </button>
          </th>
          <th
            data-tooltip-id="react-tooltip"
            data-tooltip-content={`Number of work items completed in the last ${queryPeriodDays} days`}
          >
            <button {...buttonProps('byVelocity')}>
              <span>Velocity</span>
              {sortIcon('byVelocity')}
            </button>
          </th>
          <th
            data-tooltip-id="react-tooltip"
            data-tooltip-content={`Average time taken to complete a work item over the last ${queryPeriodDays} days`}
          >
            <button {...buttonProps('byCycleTime')}>
              <span>Cycle time</span>
              {sortIcon('byCycleTime')}
            </button>
          </th>
          <th
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Average time taken to take a work item to production after development is complete"
          >
            <button {...buttonProps('byChangeLeadTime')}>
              <span>CLT</span>
              {sortIcon('byChangeLeadTime')}
            </button>
          </th>
          <th
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Fraction of overall time that work items spend in work centers on average"
          >
            <button {...buttonProps('byFlowEfficiency')}>
              <span>Flow efficiency</span>
              {sortIcon('byFlowEfficiency')}
            </button>
          </th>
          <th
            data-tooltip-id="react-tooltip"
            data-tooltip-content={`WIP items over the last ${queryPeriodDays} days`}
          >
            <button {...buttonProps('byWipCount')}>
              <span>WIP</span>
              {sortIcon('byWipCount')}
            </button>
          </th>
          <th
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Average age of work items in progress"
          >
            <button {...buttonProps('byWipAge')}>
              <span>WIP age</span>
              {sortIcon('byWipAge')}
            </button>
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

const CollectionWorkItemsSummary: React.FC<{ collectionName: string }> = ({
  collectionName,
}) => {
  const workItems = trpc.summary.collectionWorkItemsSummary.useQuery({
    collectionName,
  });

  const topLevelSummaries = useMemo(() => {
    if (!workItems.data) return;

    return ['User Story'].map(witName => {
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

    const bugTypes = Object.fromEntries(
      Object.entries(workItems.data.types).filter(([, wit]) =>
        wit.name[0].toLowerCase().includes('bug')
      )
    );

    const groupsMap = Object.entries(workItems.data.groups).reduce(
      (acc, [groupId, group]) => {
        if (!Object.keys(bugTypes).includes(group.witId)) return acc;
        if (group.name === 'no-group') return acc;

        acc.set(group.name.toLowerCase(), [
          ...(acc.get(group.name.toLowerCase()) || []),
          { ...group, groupId },
        ]);
        return acc;
      },
      new Map<string, { witId: string; name: string; groupId: string }[]>()
    );

    return {
      types: bugTypes,
      groups: [...groupsMap.values()].map(g => ({
        name: g[0].name,
        icon: bugTypes[g[0].witId].icon,
        projects: workItems.data.projects.map(p => {
          return {
            name: p.project,
            summary: aggregateAcrossGroups(
              [...groupsMap.values()].reduce<ProjectWorkItemSummaryForType>(
                (acc, group) => {
                  group.forEach(g => {
                    acc[g.witId + g.groupId] =
                      p.byType[g.witId]?.[g.groupId] || emptySummary;
                  });
                  return acc;
                },
                {}
              )
            ),
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
      <h2 className="font-bold text-2xl my-2">Flow metrics</h2>
      {topLevelSummaries?.map(summary => {
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

      <h2 className="font-bold text-2xl my-2 mt-6">Quality metrics</h2>
      {summariesForBugs?.groups.map(group => (
        <details key={group.name}>
          <summary className="font-semibold text-xl my-2 cursor-pointer">
            <img
              src={group.icon}
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
