import type { MouseEventHandler, ReactNode } from 'react';
import React, {
  useMemo,
  useState, useCallback, Fragment
} from 'react';
import {
  asc, byNum, byString, desc
} from 'sort-lib';
import type { SummaryMetrics } from '../../../shared/types.js';
import { divide, exists, toPercentage } from '../../../shared/utils.js';
import { num, prettyMS } from '../../helpers/utils.js';
import {
  ArrowDown, ArrowUp, ExternalLink
} from '../common/Icons.js';
import ExtendedLabelWithSparkline from '../graphs/ExtendedLabelWithSparkline.js';
import { LabelWithSparkline } from '../graphs/Sparkline.js';
import { pathRendererSkippingUndefineds } from '../graphs/sparkline-renderers.js';
import {
  buildRunsSparkline, changeLeadTimeSparkline, coverageSparkline,
  cycleTimeSparkline, flowEfficiencySparkline, newBugsSparkline, newItemsSparkline,
  newSonarSetupsSparkline, testAutomationSparkline, velocitySparkline, wipTrendSparkline
} from '../sparkline-props.js';
import type { SummaryGroupKey } from './utils.js';
import {
  workItemTypeByName,
  decreaseIsBetter, increaseIsBetter, processSummary,
  flattenSummaryGroups, getMetricCategoryDefinitionId, allExceptExpectedKeys
} from './utils.js';

const renderGroupItem = (link: string) => (label: ReactNode, anchor = '') => (
  <div className="group">
    <a
      href={`${link}${anchor}`}
      className="text-blue-500"
      target="_blank"
      rel="noreferrer"
    >
      <span className="font-medium text-lg text-black inline-block">{label}</span>
      <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
    </a>
  </div>
);

type CollapsibleSectionProps = {
  heading: ReactNode;
  table: () => {
    columns: ({
      label: string;
      tooltip: string;
    } | null)[];
    rows: {
      key: string;
      values: {
        content: ReactNode;
        value: string | number;
      }[];
    }[];
  };
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ heading, table }) => {
  const [tableData, setTableData] = useState<ReturnType<typeof table> | null>(null);
  const [sort, setSort] = useState<{
    byIndex: number;
    direction: 'asc' | 'desc';
  }>({ byIndex: 0, direction: 'asc' });

  const onColumnClick = useCallback((index: number) => () => {
    setSort(sort => {
      const newSort: typeof sort = ({
        byIndex: index,
        // eslint-disable-next-line no-nested-ternary
        direction: sort.byIndex === index
          ? (sort.direction === 'asc' ? 'desc' : 'asc')
          : 'asc'
      });

      return newSort;
    });
  }, []);

  const onDetailsClick = useCallback<MouseEventHandler<HTMLDetailsElement>>(() => {
    if (!tableData) setTableData(table());
  }, [table, tableData]);

  return (
    <details onToggle={onDetailsClick}>
      <summary className="font-semibold text-xl my-2 cursor-pointer">
        {heading}
      </summary>

      <div className="bg-white shadow rounded-lg my-4 mb-8">
        {tableData
          ? (
            <table className="summary-table">
              <thead>
                <tr>
                  {tableData.columns.map((col, index) => (
                    <th
                      data-tip={col?.tooltip}
                      key={col?.label || 'heading'}
                    >
                      {col?.label && (
                        <button
                          onClick={onColumnClick(index)}
                        >
                          {col.label}
                          <span className="ml-2 inline-block text-white">
                            {
                              // eslint-disable-next-line no-nested-ternary
                              sort.byIndex === index
                                ? (
                                  sort.direction === 'asc'
                                    ? <ArrowUp className="w-4" />
                                    : <ArrowDown className="w-4" />
                                )
                                : (
                                  <div className="h-6" />
                                )
                            }
                          </span>
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows
                  .sort(
                    (sort.direction === 'asc' ? asc : desc)(
                      (sort.byIndex === 0
                        ? byString(row => row.values[sort.byIndex].value as string)
                        : byNum(row => row.values[sort.byIndex].value as number)
                      )
                    )
                  )
                  .map(row => (
                    <tr key={row.key}>
                      {row.values.map((cell, j) => (
                        // Ok to use indexes as keys since we're never changing order
                        // eslint-disable-next-line react/no-array-index-key
                        <td key={j}>{cell.content}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          )
          : null}
      </div>
    </details>
  );
};

const FlowMetricsByWorkItemType: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
  workItemTypeName: string;
  queryPeriodDays: number;
}> = ({
  groups, workItemTypes, workItemTypeName, queryPeriodDays
}) => {
  const table = useCallback(() => ({
    columns: [
      null,
      { label: 'New', tooltip: `Number of new work items added in the last ${queryPeriodDays} days` },
      { label: 'Velocity', tooltip: `Number of work items completed in the last ${queryPeriodDays} days` },
      { label: 'Cycle time', tooltip: `Average time taken to complete a work item over the last ${queryPeriodDays} days` },
      { label: 'CLT', tooltip: 'Average time taken to take a work item to production after development is complete' },
      { label: 'Flow efficiency', tooltip: 'Fraction of overall time that work items spend in work centers on average' },
      { label: 'WIP trend', tooltip: `WIP items over the last ${queryPeriodDays} days` },
      { label: 'WIP age', tooltip: 'Average age of work items in progress' }
    ],
    rows: groups
      .filter(group => {
        const wit = workItemTypeByName(workItemTypeName)(workItemTypes);
        return wit ? group.workItems[wit.witId] : null;
      })
      .map(group => {
        // Ok to non-null-assert since we're covered by the filter clause above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { witId, wit } = workItemTypeByName(workItemTypeName)(workItemTypes)!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const workItems = flattenSummaryGroups(group.workItems[witId]!);
        const [filterKey] = allExceptExpectedKeys(group);
        const filterQS = `?filter=${encodeURIComponent(`${filterKey}:${group[filterKey as SummaryGroupKey]}`)}`;
        const projectLink = `/${group.collection}/${group.project}/${filterQS}`;
        const portfolioProjectLink = `/${group.collection}/${group.portfolioProject}/${filterQS}`;

        const renderMetric = renderGroupItem(
          wit.name[0] === 'Feature' ? portfolioProjectLink : projectLink
        );

        return {
          key: group.groupName,
          values: [
            { value: group.groupName, content: group.groupName },
            {
              value: workItems.leakage,
              content: renderMetric(
                <ExtendedLabelWithSparkline
                  data={workItems.leakageByWeek}
                  {...newItemsSparkline}
                />,
                '#new-work-items'
              )
            },
            {
              value: workItems.velocity,
              content: renderMetric(
                <ExtendedLabelWithSparkline
                  data={workItems.velocityByWeek}
                  {...velocitySparkline}
                />,
                '#velocity'
              )
            },
            {
              value: workItems.cycleTime,
              content: renderMetric(
                workItems.cycleTime
                  ? (
                    <ExtendedLabelWithSparkline
                      data={workItems.cycleTimeByWeek}
                      {...cycleTimeSparkline}
                    />
                  ) : '-',
                '#cycle-time'
              )
            },
            {
              value: workItems.changeLeadTime,
              content: renderMetric(workItems.changeLeadTime
                ? (
                  <ExtendedLabelWithSparkline
                    data={workItems.changeLeadTimeByWeek}
                    {...changeLeadTimeSparkline}
                  />
                )
                : '-',
              '#change-lead-time')
            },
            {
              value: divide(workItems.flowEfficiency.wcTime, workItems.flowEfficiency.total).getOr(0),
              content: renderMetric(
                workItems.flowEfficiency
                  ? (
                    <ExtendedLabelWithSparkline
                      data={workItems.flowEfficiencyByWeek}
                      {...flowEfficiencySparkline}
                    />
                  )
                  : '-',
                '#flow-efficiency'
              )
            },
            {
              value: workItems.wipCount,
              content: renderMetric(
                workItems.wipCount
                  ? (
                    <ExtendedLabelWithSparkline
                      data={workItems.wipTrend}
                      {...wipTrendSparkline}
                    />
                  )
                  : '0',
                '#age-of-work-in-progress-features-by-state'
              )
            },
            {
              value: workItems.wipAge,
              content: renderMetric(
                workItems.wipAge ? prettyMS(workItems.wipAge) : '-',
                '#age-of-work-in-progress-items'
              )
            }
          ]
        };
      })
  }), [groups, queryPeriodDays, workItemTypeName, workItemTypes]);

  return (
    <CollapsibleSection
      heading={(
        <>
          <img
            src={Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.icon}
            alt={`Icon for ${Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.name[1]}`}
            className="inline-block mr-1"
            width="18"
          />
          {Object.values(workItemTypes).find(wit => wit.name[0] === workItemTypeName)?.name[1]}
        </>
      )}
      table={table}
    />
  );
};

const equivalientEnvironments = ['Replica', 'Pre-Prod'];

const QualityMetrics: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
  queryPeriodDays: number;
}> = ({ groups, workItemTypes, queryPeriodDays }) => {
  const sections = useMemo(() => {
    const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
    if (!bugsDefinitionId) return null;

    const allEnvironments = [...new Set(groups.flatMap(group => Object.keys(group.workItems[bugsDefinitionId] || {})))]
      .sort((a, b) => {
        if (!groups[0].environments) return 0;
        return groups[0].environments.indexOf(a) - groups[0].environments.indexOf(b);
      });

    return allEnvironments
      // eslint-disable-next-line func-call-spacing, no-spaced-func
      .reduce<{ sections: (CollapsibleSectionProps & { key: string })[]; encounteredEquivalentEnvironment: boolean }>(
        ({ sections, encounteredEquivalentEnvironment }, env) => {
          const envDisplayName = equivalientEnvironments.includes(env) ? equivalientEnvironments.join(' or ') : env;

          if (equivalientEnvironments.includes(env) && encounteredEquivalentEnvironment) {
            return {
              sections, encounteredEquivalentEnvironment
            };
          }

          sections.push({
            key: envDisplayName,
            heading: (
              <span className="inline-flex align-middle">
                <img
                  src={workItemTypes[bugsDefinitionId].icon}
                  alt={`Icon for ${envDisplayName} ${workItemTypes[bugsDefinitionId].name[0]}`}
                  className="inline-block mr-1"
                  width="18"
                />
                {envDisplayName}
              </span>
            ),
            table: () => ({
              columns: [
                null,
                { label: 'New bugs', tooltip: `Number of bugs opened in the last ${queryPeriodDays} days` },
                { label: 'Bugs fixed', tooltip: `Number of bugs closed in the last ${queryPeriodDays} days` },
                { label: 'Bugs cycle time', tooltip: 'Average time taken to close a bug' },
                { label: 'Bugs CLT', tooltip: 'Average time taken to close a bug once development is complete' },
                { label: 'Flow efficiency', tooltip: 'Fraction of overall time that work items spend in work centers on average' },
                { label: 'WIP trend', tooltip: `WIP bugs over the last ${queryPeriodDays} days` },
                { label: 'WIP age', tooltip: 'Average age of work-in-progress bugs' }
              ],
              rows: groups
                .map(group => {
                  const bugs = group.workItems[bugsDefinitionId] || {};
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

                  return {
                    key: group.groupName,
                    values: [
                      { value: group.groupName, content: group.groupName },
                      {
                        value: bugsForEnv?.leakage || 0,
                        content: renderBugMetric(
                          bugsForEnv
                            ? (
                              <ExtendedLabelWithSparkline
                                data={bugsForEnv.leakageByWeek}
                                {...newBugsSparkline}
                              />
                            )
                            : '-',
                          '#bug-leakage-with-root-cause'
                        )
                      },
                      {
                        value: bugsForEnv?.velocity || 0,
                        content: renderBugMetric(
                          bugsForEnv
                            ? (
                              <ExtendedLabelWithSparkline
                                data={bugsForEnv.velocityByWeek}
                                {...velocitySparkline}
                              />
                            )
                            : '-',
                          '#velocity'
                        )
                      },
                      {
                        value: bugsForEnv?.cycleTime || 0,
                        content: renderBugMetric(
                          bugsForEnv?.cycleTime
                            ? (
                              <ExtendedLabelWithSparkline
                                data={bugsForEnv.cycleTimeByWeek}
                                {...cycleTimeSparkline}
                              />
                            )
                            : '-',
                          '#cycle-time'
                        )
                      },
                      {
                        value: bugsForEnv?.changeLeadTime || 0,
                        content: renderBugMetric(
                          bugsForEnv?.changeLeadTime
                            ? (
                              <ExtendedLabelWithSparkline
                                data={bugsForEnv.changeLeadTimeByWeek}
                                {...changeLeadTimeSparkline}
                              />
                            )
                            : '-',
                          '#change-lead-time'
                        )
                      },
                      {
                        value: divide(bugsForEnv?.flowEfficiency.wcTime || 0, bugsForEnv?.flowEfficiency.total || 0).getOr(0),
                        content: renderBugMetric(
                          bugsForEnv?.flowEfficiency
                            ? (
                              <ExtendedLabelWithSparkline
                                data={bugsForEnv.flowEfficiencyByWeek}
                                {...flowEfficiencySparkline}
                              />
                            )
                            : '-',
                          '#flow-efficiency'
                        )
                      },
                      {
                        value: bugsForEnv?.wipCount || 0,
                        content: renderBugMetric(
                          bugsForEnv
                            ? (
                              <ExtendedLabelWithSparkline
                                data={bugsForEnv.wipTrend}
                                {...wipTrendSparkline}
                              />
                            )
                            : '-',
                          '#work-in-progress-trend'
                        )
                      },
                      {
                        value: bugsForEnv?.wipAge || 0,
                        content: renderBugMetric(bugsForEnv?.wipAge ? prettyMS(bugsForEnv.wipAge) : '-', '#age-of-work-in-progress-items')
                      }
                    ]
                  };
                })
            })
          });

          return {
            sections,
            encounteredEquivalentEnvironment: equivalientEnvironments.includes(env) ? true : encounteredEquivalentEnvironment
          };
        }, { sections: [], encounteredEquivalentEnvironment: false })
      .sections;
  }, [groups, queryPeriodDays, workItemTypes]);

  if (!sections) return null;

  return (
    <>
      {sections.map(section => <CollapsibleSection {...section} />)}
    </>
  );
};

const RepoAnalysisDetails: React.FC<{ repoStats: SummaryMetrics['groups'][number]['repoStats']}> = ({ repoStats }) => (
  <p className="justify-self-end text-xs text-gray-600 font-normal">
    {'Analysed '}
    <b className="text-gray-800 font-semibold">{num(repoStats.repos)}</b>
    {` ${repoStats.repos === 1 ? 'repo' : 'repos'}`}
    {repoStats.excluded ? (
      <>
        {', excluded '}
        <b className="text-gray-800 font-semibold">{num(repoStats.excluded)}</b>
        {`inactive ${repoStats.excluded === 1 ? 'repo' : 'repos'}`}
      </>
    ) : ''}
  </p>
);

const metricsFormatters = (group: SummaryMetrics['groups'][number]) => {
  const [filterKey] = allExceptExpectedKeys(group);
  const filterQS = `?group=${encodeURIComponent(`${group[filterKey as SummaryGroupKey]}`)}`;
  const baseProjectLink = `/${group.collection}/${group.project}`;
  const reposMetric = renderGroupItem(`${baseProjectLink}/repos${filterQS}`);
  const pipelinesMetric = renderGroupItem(`${baseProjectLink}/release-pipelines${filterQS}`);

  return { reposMetric, pipelinesMetric };
};

const TestAutomationMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => {
  const table: CollapsibleSectionProps['table'] = useCallback(() => ({
    columns: [
      null,
      { label: 'Tests', tooltip: 'Number of unit / components tests running in build pipelines' },
      { label: 'Coverage', tooltip: 'Percentage of code covered by tests' },
      ...groups[0].pipelineStats.stages.flatMap(stage => [
        { label: `Pipelines having ${stage.name}`, tooltip: `Percentage of pipelines having ${stage.name}` },
        { label: `Pipelines using ${stage.name}`, tooltip: `Percentage of pipelines using ${stage.name}` }
      ])
    ],
    rows: groups.map(group => {
      const { repoStats, pipelineStats, groupName } = group;
      const { reposMetric, pipelinesMetric } = metricsFormatters(group);

      return {
        key: groupName,
        values: [
          {
            value: groupName,
            content: (
              <>
                {groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: repoStats.tests,
            content: reposMetric((
              <ExtendedLabelWithSparkline
                data={repoStats.testsByWeek}
                {...testAutomationSparkline}
              />
            ))
          },
          {
            value: repoStats.coverage === '-' ? 0 : Number.parseInt(repoStats.coverage, 10),
            content: reposMetric(
              <ExtendedLabelWithSparkline
                data={repoStats.coverageByWeek}
                {...coverageSparkline}
              />
            )
          },
          ...pipelineStats.stages.flatMap(stage => [
            {
              value: divide(stage.exists, pipelineStats.pipelines).getOr(0),
              content: pipelinesMetric(
                divide(stage.exists, pipelineStats.pipelines)
                  .map(toPercentage)
                  .getOr('-')
              )
            },
            {
              value: divide(stage.used, pipelineStats.pipelines).getOr(0),
              content: pipelinesMetric(
                divide(stage.used, pipelineStats.pipelines)
                  .map(toPercentage)
                  .getOr('-')
              )
            }
          ])
        ]
      };
    })
  }), [groups]);

  return (
    <CollapsibleSection
      heading="Test automation"
      table={table}
    />
  );
};

const CodeQualityMetrics: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => {
  const table: CollapsibleSectionProps['table'] = useCallback(() => ({
    columns: [
      null,
      { label: 'Sonar', tooltip: 'Percentage of repos with Sonar configured' },
      { label: 'Ok', tooltip: 'Percentage of pipelines with sonar configured that pass quality checks' },
      { label: 'Warn', tooltip: 'Percentage of pipelines with sonar configured that have a warning for quality checks' },
      { label: 'Fail', tooltip: 'Percentage of pipelines with sonar configured that fail quality checks' },
      { label: 'Branch policy met', tooltip: 'Percentage of pipelines conforming to branch policies' },
      { label: 'Healthy branches', tooltip: 'Percentage of healthy branches' }
    ],
    rows: groups.map(group => {
      const { repoStats, pipelineStats, groupName } = group;
      const {
        codeQuality, repos, newSonarSetupsByWeek, sonarCountsByWeek, healthyBranches
      } = repoStats;
      const { reposMetric } = metricsFormatters(group);

      return {
        key: groupName,
        values: [
          {
            value: groupName,
            content: (
              <>
                {groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: divide(codeQuality.configured, repos).getOr(0),
            content: (
              <div data-tip={`${codeQuality.configured} of ${repos} repos have SonarQube configured`}>
                {repos
                  ? reposMetric(
                    <ExtendedLabelWithSparkline
                      data={newSonarSetupsByWeek}
                      {...newSonarSetupsSparkline(repos)}
                    />
                  )
                  : '-'}
              </div>
            )
          },
          {
            value: divide(codeQuality.pass, codeQuality.sonarProjects).getOr(0),
            content: (
              <div data-tip={`${codeQuality.pass} of ${codeQuality.sonarProjects} sonar projects have 'pass' quality gate`}>
                {codeQuality.sonarProjects
                  ? (
                    <LabelWithSparkline
                      label={divide(codeQuality.pass, codeQuality.sonarProjects).map(toPercentage).getOr('-')}
                      data={sonarCountsByWeek.pass}
                      lineColor={increaseIsBetter(sonarCountsByWeek.pass)}
                      yAxisLabel={x => `${x}%`}
                    />
                  )
                  : '-'}
              </div>
            )
          },
          {
            value: divide(codeQuality.warn, codeQuality.sonarProjects).getOr(0),
            content: (
              <div data-tip={`${codeQuality.warn} of ${codeQuality.sonarProjects} sonar projects have 'warn' quality gate`}>
                {codeQuality.sonarProjects
                  ? (
                    <LabelWithSparkline
                      label={divide(codeQuality.warn, codeQuality.sonarProjects).map(toPercentage).getOr('-')}
                      data={sonarCountsByWeek.warn}
                      lineColor={decreaseIsBetter(sonarCountsByWeek.warn)}
                      yAxisLabel={x => `${x}%`}
                    />
                  )
                  : '-'}
              </div>
            )
          },
          {
            value: divide(codeQuality.fail, codeQuality.sonarProjects).getOr(0),
            content: (
              <div data-tip={`${codeQuality.fail} of ${codeQuality.sonarProjects} sonar projects have 'fail' quality gate`}>
                {codeQuality.sonarProjects
                  ? (
                    <LabelWithSparkline
                      label={divide(codeQuality.fail, codeQuality.sonarProjects).map(toPercentage).getOr('-')}
                      data={sonarCountsByWeek.fail}
                      lineColor={decreaseIsBetter(sonarCountsByWeek.fail)}
                      yAxisLabel={x => `${x}%`}
                    />
                  )
                  : '-'}
              </div>
            )
          },
          {
            value: divide(pipelineStats.conformsToBranchPolicies, pipelineStats.pipelines).getOr(0),
            content: reposMetric(
              divide(pipelineStats.conformsToBranchPolicies, pipelineStats.pipelines)
                .map(toPercentage)
                .getOr('-')
            )
          },
          {
            value: divide(healthyBranches.count, healthyBranches.total)
              .map(toPercentage)
              .getOr('-'),
            content: reposMetric(
              divide(healthyBranches.count, healthyBranches.total)
                .map(toPercentage)
                .getOr('-')
            )
          }
        ]
      };
    })
  }), [groups]);

  return (
    <CollapsibleSection
      heading="Code quality"
      table={table}
    />
  );
};

type CIBuildsProps = {
  groups: SummaryMetrics['groups'];
  queryPeriodDays: number;
};

const CIBuilds: React.FC<CIBuildsProps> = ({ groups, queryPeriodDays }) => {
  const table: CollapsibleSectionProps['table'] = useCallback(() => ({
    columns: [
      null,
      { label: 'Runs', tooltip: `Number of CI builds run in the last ${queryPeriodDays} days` },
      { label: 'Success', tooltip: 'Percentage of successful builds' },
      { label: 'YAML pipelines', tooltip: 'Pipelines configured using a YAML file' },
      { label: 'Uses central template', tooltip: 'Pipelines using the standard template' }
    ],
    rows: groups.map(group => {
      const { repoStats, groupName } = group;
      const { reposMetric } = metricsFormatters(group);

      return {
        key: groupName,
        values: [
          {
            value: groupName,
            content: (
              <>
                {groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: repoStats.builds.total,
            content: reposMetric(
              <ExtendedLabelWithSparkline
                data={repoStats.builds.byWeek}
                {...buildRunsSparkline}
              />
            )
          },
          {
            value: divide(repoStats.builds.successful, repoStats.builds.total).getOr(0),
            content: reposMetric(
              <LabelWithSparkline
                label={
                  divide(repoStats.builds.successful, repoStats.builds.total)
                    .map(toPercentage)
                    .getOr('-')
                }
                data={repoStats.builds.successfulByWeek}
                lineColor={increaseIsBetter(repoStats.builds.successfulByWeek)}
                yAxisLabel={x => `${x}%`}
              />
            )
          },
          {
            value: divide(repoStats.ymlPipelines.count, repoStats.ymlPipelines.total).getOr(0),
            content: reposMetric(
              repoStats.ymlPipelines.total === 0
                ? '-'
                : `${Math.round((repoStats.ymlPipelines.count * 100) / repoStats.ymlPipelines.total)}%`
            )
          },
          {
            value: divide(repoStats.usesCentralTemplate.count, repoStats.usesCentralTemplate.total).getOr(0),
            content: reposMetric(
              repoStats.usesCentralTemplate.total === 0
                ? '0%'
                : `${Math.round((repoStats.usesCentralTemplate.count * 100) / repoStats.usesCentralTemplate.total)}%`
            )
          }
        ]
      };
    })
  }), [groups, queryPeriodDays]);

  return (
    <CollapsibleSection
      heading="CI Builds"
      table={table}
    />
  );
};

const Releases: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => {
  const table: CollapsibleSectionProps['table'] = useCallback(() => ({
    columns: [
      null,
      { label: 'Master-only releases', tooltip: 'Percentage of releases where all the artifacts were from the master branch' },
      { label: 'Starts with artifact', tooltip: 'Number of release pipelines that start with an artifact' },
      { label: 'Repos with release pipelines', tooltip: 'Number of repos having release pipelines' }
    ],
    rows: groups.map(group => {
      const { pipelineStats, repoStats, groupName } = group;
      const { reposMetric, pipelinesMetric } = metricsFormatters(group);

      return {
        key: groupName,
        values: [
          {
            value: groupName,
            content: (
              <>
                {groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: divide(pipelineStats.masterOnlyPipelines.count, pipelineStats.masterOnlyPipelines.total).getOr(0),
            content: pipelinesMetric(
              <LabelWithSparkline
                label={
                  divide(pipelineStats.masterOnlyPipelines.count, pipelineStats.masterOnlyPipelines.total)
                    .map(toPercentage)
                    .getOr('-')
                }
                data={pipelineStats.masterOnlyReleasesByWeek}
                lineColor={increaseIsBetter(pipelineStats.masterOnlyReleasesByWeek.filter(exists))}
                yAxisLabel={x => `${x}%`}
                renderer={pathRendererSkippingUndefineds}
              />
            )
          },
          {
            value: divide(pipelineStats.startsWithArtifact, pipelineStats.pipelines).getOr(0),
            content: pipelinesMetric(
              divide(pipelineStats.startsWithArtifact, pipelineStats.pipelines)
                .map(toPercentage)
                .getOr('-')
            )
          },
          {
            value: divide(repoStats.hasPipelines, repoStats.repos).getOr(0),
            content: reposMetric(
              divide(repoStats.hasPipelines, repoStats.repos)
                .map(toPercentage)
                .getOr('-')
            )
          }
        ]
      };
    })
  }), [groups]);

  return (
    <CollapsibleSection
      heading="Releases"
      table={table}
    />
  );
};

const SummaryByMetric: React.FC<{
  groups: SummaryMetrics['groups'];
  workItemTypes: SummaryMetrics['workItemTypes'];
  queryPeriodDays: number;
}> = ({ groups, workItemTypes, queryPeriodDays }) => (
  <div className="mt-8">
    <h2 className="text-2xl font-bold">Flow metrics</h2>

    <FlowMetricsByWorkItemType
      groups={groups}
      workItemTypes={workItemTypes}
      workItemTypeName="Feature"
      queryPeriodDays={queryPeriodDays}
    />

    <FlowMetricsByWorkItemType
      groups={groups}
      workItemTypes={workItemTypes}
      workItemTypeName="User Story"
      queryPeriodDays={queryPeriodDays}
    />

    <h2 className="text-2xl font-bold mt-8">Quality metrics</h2>
    <QualityMetrics
      groups={groups}
      workItemTypes={workItemTypes}
      queryPeriodDays={queryPeriodDays}
    />

    <h2 className="text-2xl font-bold mt-8">Health metrics</h2>
    <TestAutomationMetrics groups={groups} />
    <CodeQualityMetrics groups={groups} />
    <CIBuilds groups={groups} queryPeriodDays={queryPeriodDays} />
    <Releases groups={groups} />
  </div>
);

export default SummaryByMetric;
