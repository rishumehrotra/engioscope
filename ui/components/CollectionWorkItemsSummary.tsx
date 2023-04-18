import React from 'react';

import type { RouterClient } from '../helpers/trpc.js';
import { trpc } from '../helpers/trpc.js';
import { divide } from '../../shared/utils';

type ProjectWorkItemSummary =
  RouterClient['summary']['collectionWorkItemsSummary']['projects'][number]['byType'][string][string];

const FlowMetricsTableHeader: React.FC<{
  queryPeriodDays: number;
}> = ({ queryPeriodDays }) => {
  return (
    <thead>
      <tr>
        <th>Project</th>
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FlowMetricsRow: React.FC<{
  projectName: string;
  summary: ProjectWorkItemSummary;
}> = ({ projectName, summary }) => {
  return (
    <tr key={projectName}>
      <td>{projectName}</td>
      {/* New */}
      <td>{summary.count}</td>
      {/* Velocity */}
      <td>{summary.velocity}</td>
      {/* Cycle time */}
      <td>cycle time</td>
      {/* CLT */}
      <td>{divide(summary.cycleTime.count, summary.cycleTime.wis).getOr('-')}</td>
      {/* Flow Efficiency */}
      <td>
        {divide(summary.flowEfficiency.wcTime, summary.flowEfficiency.total).getOr('-')}
      </td>
      {/* WIP trend */}
      <td>{summary.wipTrend}</td>
      {/* WIP age */}
      <td>{divide(summary.wipAge.count, summary.wipAge.wis).getOr('-')}</td>
    </tr>
  );
};

const CollectionWorkItemsSummary: React.FC<{
  collectionName: string;
}> = ({ collectionName }) => {
  const workItems = trpc.summary.collectionWorkItemsSummary.useQuery({
    collectionName,
  });

  if (!collectionName || !workItems.data?.projects.length) {
    return <div>Sorry No Projects Found</div>;
  }

  return (
    <div>
      <h2 className="font-semibold text-2xl my-2">Flow Metrics</h2>
      {Object.entries(workItems.data.types)
        .filter(([, value]) => value.name[0] === 'Feature')
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
                  <FlowMetricsTableHeader queryPeriodDays={90} />
                  <tbody>
                    {workItems.data.projects.map(project => {
                      return (
                        <tr key={project.project}>
                          <td>{project.project}</td>
                          {/* New */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.count || value.count !== null
                                      ? accumulator + value.count
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* Velocity */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* Cycle time */}
                          <td>cycle time</td>
                          {/* CLT */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* Flow Efficiency */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* WIP trend */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* WIP age */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
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
      {Object.entries(workItems.data.types)
        .filter(([, value]) => value.name[0] === 'User Story')
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
                  <FlowMetricsTableHeader queryPeriodDays={90} />
                  <tbody>
                    {workItems.data.projects.map(project => {
                      return (
                        <tr key={project.project}>
                          <td>{project.project}</td>
                          {/* New */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.leakage || value.leakage !== null
                                      ? accumulator + value.count
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* Velocity */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* Cycle time */}
                          <td>cycle time</td>
                          {/* CLT */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* Flow Efficiency */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* WIP trend */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                          {/* WIP age */}
                          <td>
                            {project.byType[key]
                              ? Object.entries(project.byType[key])?.reduce(
                                  (accumulator, [, value]) => {
                                    return value.velocity || value.velocity !== null
                                      ? accumulator + value.velocity
                                      : accumulator;
                                  },
                                  0
                                )
                              : 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tbody />
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
