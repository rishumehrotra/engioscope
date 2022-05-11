import type { MouseEventHandler, ReactNode } from 'react';
import React, {
  useMemo,
  useState, useCallback, Fragment
} from 'react';
import {
  asc, byNum, byString, desc
} from '../../../shared/sort-utils';
import type { SummaryMetrics } from '../../../shared/types';
import { divide, toPercentage } from '../../../shared/utils';
import { num, prettyMS } from '../../helpers/utils';
import {
  ArrowDown, ArrowUp, ExternalLink
} from '../common/Icons';
import { LabelWithSparkline } from '../graphs/Sparkline';
import { pathRendererSkippingUndefineds } from '../graphs/sparkline-renderers';
import type { SummaryGroupKey } from './utils';
import {
  workItemTypeByName,
  flowEfficiency,
  decreaseIsBetter, increaseIsBetter, processSummary,
  flattenSummaryGroups, getMetricCategoryDefinitionId, allExceptExpectedKeys
} from './utils';

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

      <div className="bg-white shadow overflow-hidden rounded-lg my-4 mb-8">
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
}> = ({ groups, workItemTypes, workItemTypeName }) => {
  const table = useCallback(() => ({
    columns: [
      null,
      { label: 'New', tooltip: 'Number of new work items added in the last 90 days' },
      { label: 'Velocity', tooltip: 'Number of work items completed in the last 90 days' },
      { label: 'Cycle time', tooltip: 'Average time taken to complete a work item over the last 90 days' },
      { label: 'CLT', tooltip: 'Average time taken to take a work item to production after development is complete' },
      { label: 'Flow efficiency', tooltip: 'Fraction of overall time that work items spend in work centers on average' },
      { label: 'WIP increase', tooltip: 'Increase in the number of WIP items over the last 90 days' },
      { label: 'WIP age', tooltip: 'Average age of work items in progress' }
    ],
    rows: groups
      .filter(group => {
        const wit = workItemTypeByName(workItemTypeName)(workItemTypes);
        return wit ? group.summary[wit.witId] : null;
      })
      .map(group => {
        // Ok to non-null-assert since we're covered by the filter clause above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { witId, wit } = workItemTypeByName(workItemTypeName)(workItemTypes)!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const summary = flattenSummaryGroups(group.summary[witId]!);
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
              value: summary.leakage,
              content: renderMetric(
                <LabelWithSparkline
                  label={summary.leakage}
                  data={summary.leakageByWeek}
                  lineColor={increaseIsBetter(summary.leakageByWeek)}
                />,
                '#new-work-items'
              )
            },
            {
              value: summary.velocity,
              content: renderMetric(
                <LabelWithSparkline
                  label={summary.velocity}
                  data={summary.velocityByWeek}
                  lineColor={increaseIsBetter(summary.velocityByWeek)}
                />,
                '#velocity'
              )
            },
            {
              value: summary.cycleTime,
              content: renderMetric(
                summary.cycleTime
                  ? (
                    <LabelWithSparkline
                      label={prettyMS(summary.cycleTime)}
                      yAxisLabel={prettyMS}
                      lineColor={decreaseIsBetter(
                        summary.cycleTimeByWeek.filter(x => x !== 0)
                      )}
                      data={summary.cycleTimeByWeek.map(x => (x === 0 ? undefined : x))}
                      renderer={pathRendererSkippingUndefineds}
                    />
                  ) : '-',
                '#cycle-time'
              )
            },
            {
              value: summary.changeLeadTime,
              content: renderMetric(summary.changeLeadTime
                ? (
                  <LabelWithSparkline
                    label={prettyMS(summary.changeLeadTime)}
                    lineColor={decreaseIsBetter(
                      summary.changeLeadTimeByWeek.filter(x => x !== 0)
                    )}
                    yAxisLabel={prettyMS}
                    data={summary.changeLeadTimeByWeek.map(x => (x === 0 ? undefined : x))}
                    renderer={pathRendererSkippingUndefineds}
                  />
                )
                : '-',
              '#change-lead-time')
            },
            {
              value: divide(summary.flowEfficiency.wcTime, summary.flowEfficiency.total).getOr(0),
              content: renderMetric(
                summary.flowEfficiency
                  ? (
                    <LabelWithSparkline
                      label={`${Math.round(flowEfficiency(summary.flowEfficiency))}%`}
                      data={summary.flowEfficiencyByWeek.map(flowEfficiency)}
                      lineColor={increaseIsBetter(summary.flowEfficiencyByWeek.map(flowEfficiency))}
                      yAxisLabel={x => `${x}%`}
                    />
                  )
                  : '-',
                '#flow-efficiency'
              )
            },
            {
              value: summary.wipCount,
              content: renderMetric(
                summary.wipCount
                  ? (
                    <LabelWithSparkline
                      label={(
                        <span className="inline-block pr-1">
                          {summary.wipIncrease}
                          <span className="text-lg text-gray-500 inline-block ml-2">
                            <span className="font-normal text-sm">of</span>
                            {' '}
                            {summary.wipCount}
                          </span>
                        </span>
                      )}
                      data={summary.wipIncreaseByWeek}
                      lineColor={decreaseIsBetter(summary.wipIncreaseByWeek)}
                    />
                  )
                  : '0',
                '#age-of-work-in-progress-features-by-state'
              )
            },
            {
              value: summary.wipAge,
              content: renderMetric(
                summary.wipAge ? prettyMS(summary.wipAge) : '-',
                '#age-of-work-in-progress-items'
              )
            }
          ]
        };
      })
  }), [groups, workItemTypeName, workItemTypes]);

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
}> = ({ groups, workItemTypes }) => {
  const sections = useMemo(() => {
    const bugsDefinitionId = getMetricCategoryDefinitionId(workItemTypes, 'Bug');
    if (!bugsDefinitionId) return null;

    const allEnvironments = [...new Set(groups.map(group => Object.keys(group.summary[bugsDefinitionId] || {})).flat())]
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
                { label: 'New bugs', tooltip: 'Number of bugs opened in the last 90 days' },
                { label: 'Bugs fixed', tooltip: 'Number of bugs closed in the last 90 days' },
                { label: 'Bugs cycle time', tooltip: 'Average time taken to close a bug' },
                { label: 'Bugs CLT', tooltip: 'Average time taken to close a bug once development is complete' },
                { label: 'Flow efficiency', tooltip: 'Fraction of overall time that work items spend in work centers on average' },
                { label: 'WIP increase', tooltip: 'Increase in the number of WIP bugs over the last 90 days' },
                { label: 'WIP age', tooltip: 'Average age of work-in-progress bugs' }
              ],
              rows: groups
                .map(group => {
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

                  return {
                    key: group.groupName,
                    values: [
                      { value: group.groupName, content: group.groupName },
                      {
                        value: bugsForEnv?.leakage || 0,
                        content: renderBugMetric(
                          bugsForEnv
                            ? (
                              <LabelWithSparkline
                                label={bugsForEnv.leakage}
                                data={bugsForEnv.leakageByWeek}
                                lineColor={decreaseIsBetter(bugsForEnv.leakageByWeek)}
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
                              <LabelWithSparkline
                                label={bugsForEnv.velocity}
                                data={bugsForEnv.velocityByWeek}
                                lineColor={increaseIsBetter(bugsForEnv.velocityByWeek)}
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
                              <LabelWithSparkline
                                label={prettyMS(bugsForEnv.cycleTime)}
                                yAxisLabel={prettyMS}
                                lineColor={decreaseIsBetter(
                                  bugsForEnv.cycleTimeByWeek.filter(x => x !== 0)
                                )}
                                data={bugsForEnv.cycleTimeByWeek.map(x => (x === 0 ? undefined : x))}
                                renderer={pathRendererSkippingUndefineds}
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
                              <LabelWithSparkline
                                label={prettyMS(bugsForEnv.changeLeadTime)}
                                lineColor={decreaseIsBetter(
                                  bugsForEnv.changeLeadTimeByWeek.filter(x => x !== 0)
                                )}
                                yAxisLabel={prettyMS}
                                data={bugsForEnv.changeLeadTimeByWeek.map(x => (x === 0 ? undefined : x))}
                                renderer={pathRendererSkippingUndefineds}
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
                              <LabelWithSparkline
                                label={`${Math.round(flowEfficiency(bugsForEnv.flowEfficiency))}%`}
                                data={bugsForEnv.flowEfficiencyByWeek.map(flowEfficiency)}
                                lineColor={increaseIsBetter(bugsForEnv.flowEfficiencyByWeek.map(flowEfficiency))}
                                yAxisLabel={x => `${x}%`}
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
                              <LabelWithSparkline
                                label={(
                                  <span className="inline-block pr-1">
                                    {bugsForEnv.wipIncrease}
                                    <span className="text-lg text-gray-500 inline-block ml-2">
                                      <span className="font-normal text-sm">of</span>
                                      {' '}
                                      {bugsForEnv.wipCount}
                                    </span>
                                  </span>
                                )}
                                data={bugsForEnv.wipIncreaseByWeek}
                                lineColor={decreaseIsBetter(bugsForEnv.wipIncreaseByWeek)}
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
  }, [groups, workItemTypes]);

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
        {` ${repoStats.excluded === 1 ? 'repo' : 'repos'}`}
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
      const { repoStats, pipelineStats } = group;
      const { reposMetric, pipelinesMetric } = metricsFormatters(group);

      return {
        key: group.groupName,
        values: [
          {
            value: group.groupName,
            content: (
              <>
                {group.groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: repoStats.tests,
            content: reposMetric((
              <LabelWithSparkline
                label={num(repoStats.tests)}
                data={repoStats.testsByWeek}
                lineColor={increaseIsBetter(repoStats.testsByWeek)}
              />
            ))
          },
          {
            value: repoStats.coverage === '-' ? 0 : parseInt(repoStats.coverage, 10),
            content: reposMetric(repoStats.coverage)
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
      { label: 'Branch policy met', tooltip: 'Percentage of pipelines conforming to branch policies' }
    ],
    rows: groups.map(group => {
      const { repoStats, pipelineStats } = group;
      const { codeQuality } = repoStats;
      const { reposMetric, pipelinesMetric } = metricsFormatters(group);

      return {
        key: group.groupName,
        values: [
          {
            value: group.groupName,
            content: (
              <>
                {group.groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: divide(codeQuality.configured, repoStats.repos).getOr(0),
            content: (
              <div data-tip={`${codeQuality.configured} of ${repoStats.repos} repos have SonarQube configured`}>
                {repoStats.repos
                  ? reposMetric(
                    <LabelWithSparkline
                      label={divide(codeQuality.configured, repoStats.repos).map(toPercentage).getOr('-')}
                      data={repoStats.newSonarSetupsByWeek}
                      lineColor={increaseIsBetter(repoStats.newSonarSetupsByWeek)}
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
                      data={repoStats.sonarCountsByWeek.pass}
                      lineColor={increaseIsBetter(repoStats.sonarCountsByWeek.pass)}
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
                      data={repoStats.sonarCountsByWeek.warn}
                      lineColor={increaseIsBetter(repoStats.sonarCountsByWeek.warn)}
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
                      data={repoStats.sonarCountsByWeek.fail}
                      lineColor={increaseIsBetter(repoStats.sonarCountsByWeek.fail)}
                      yAxisLabel={x => `${x}%`}
                    />
                  )
                  : '-'}
              </div>
            )
          },
          {
            value: divide(pipelineStats.conformsToBranchPolicies, pipelineStats.pipelines).getOr(0),
            content: pipelinesMetric(
              divide(pipelineStats.conformsToBranchPolicies, pipelineStats.pipelines)
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

const CIBuilds: React.FC<{ groups: SummaryMetrics['groups'] }> = ({ groups }) => {
  const table: CollapsibleSectionProps['table'] = useCallback(() => ({
    columns: [
      null,
      { label: 'Runs', tooltip: 'Number of CI builds run in the last 90 days' },
      { label: 'Success', tooltip: 'Percentage of successful builds' },
      { label: 'YAML pipelines', tooltip: 'Pipelines configured using a YAML file' },
      { label: 'MTTR build failure', tooltip: 'Average time taken to fix a build failure' }
    ],
    rows: groups.map(group => {
      const { repoStats } = group;
      const { reposMetric } = metricsFormatters(group);

      return {
        key: group.groupName,
        values: [
          {
            value: group.groupName,
            content: (
              <>
                {group.groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: repoStats.builds.total,
            content: reposMetric(
              <LabelWithSparkline
                label={num(repoStats.builds.total)}
                data={repoStats.builds.byWeek}
                lineColor={increaseIsBetter(repoStats.builds.byWeek)}
                yAxisLabel={num}
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
                yAxisLabel={num}
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
            value: 0,
            content: <span className="bg-gray-100 py-1 px-2 rounded text-xs uppercase">Coming soon</span>
          }
        ]
      };
    })
  }), [groups]);

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
      { label: 'Master only pipelines', tooltip: 'Number of release pipelines that only release from the master branch' },
      { label: 'Starts with artifact', tooltip: 'Number of release pipelines that start with an artifact' },
      { label: 'Repos with release pipelines', tooltip: 'Number of repos having release pipelines' }
    ],
    rows: groups.map(group => {
      const { pipelineStats, repoStats } = group;
      const { reposMetric, pipelinesMetric } = metricsFormatters(group);

      return {
        key: group.groupName,
        values: [
          {
            value: group.groupName,
            content: (
              <>
                {group.groupName}
                <RepoAnalysisDetails repoStats={repoStats} />
              </>
            )
          },
          {
            value: divide(pipelineStats.masterOnlyPipelines.count, pipelineStats.masterOnlyPipelines.total).getOr(0),
            content: pipelinesMetric(
              divide(pipelineStats.masterOnlyPipelines.count, pipelineStats.masterOnlyPipelines.total)
                .map(toPercentage)
                .getOr('-')
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
}> = ({ groups, workItemTypes }) => (
  <div className="mt-8">
    <h2 className="text-2xl font-bold">Flow metrics</h2>

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

    <h2 className="text-2xl font-bold mt-8">Quality metrics</h2>
    <QualityMetrics groups={groups} workItemTypes={workItemTypes} />

    <h2 className="text-2xl font-bold mt-8">Health metrics</h2>
    <TestAutomationMetrics groups={groups} />
    <CodeQualityMetrics groups={groups} />
    <CIBuilds groups={groups} />
    <Releases groups={groups} />
  </div>
);

export default SummaryByMetric;
