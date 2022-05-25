import React, { Fragment } from 'react';
import { last } from 'rambda';
import type { Pipeline } from '../../shared/types';
import { exists, num } from '../helpers/utils';
import type { NormalizedPolicies } from '../../shared/pipeline-utils';
import {
  masterOnlyReleasesByWeek, pipelineHasStartingArtifact,
  totalUsageByEnvironment, masterDeploysCount, pipelineHasStageNamed,
  pipelineMeetsBranchPolicyRequirements, pipelineUsesStageNamed
} from '../../shared/pipeline-utils';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';
import { count, incrementIf } from '../../shared/reducer-utils';
import UsageByEnv from './UsageByEnv';
import { divide, toPercentage } from '../../shared/utils';
import { LabelWithSparkline } from './graphs/Sparkline';
import { increaseIsBetter } from './summary-page/utils';
import { pathRendererSkippingUndefineds } from '../components/graphs/sparkline-renderers';

export const envRowTooltip = (env: string, successful: number, total: number, pipelineCount: number) => `
  <b>${env}</b><br />
  Successful deployments: <b>${num(successful)}</b><br />
  Total deployments: <b>${num(total)}</b><br />
  Total pipelines: <b>${num(pipelineCount)}</b>
`;

type ReleasePipelineSummaryProps = {
  pipelines: Pipeline[];
  stagesToHighlight?: string[];
  policyForBranch: (repoId: string, branch: string) => NormalizedPolicies;
  ignoreStagesBefore?: string;
  environments?: string[];
  queryPeriodDays: number;
};

const ReleasePipelineSummary: React.FC<ReleasePipelineSummaryProps> = ({
  pipelines, stagesToHighlight, policyForBranch, ignoreStagesBefore, environments, queryPeriodDays
}) => {
  const masterDeploys = masterDeploysCount(pipelines);
  const masterReleasesByWeek = masterOnlyReleasesByWeek(pipelines);

  const policyPassCount = count(
    incrementIf(pipelineMeetsBranchPolicyRequirements(policyForBranch))
  )(pipelines);

  const perEnvUsage = totalUsageByEnvironment(environments)(pipelines);
  const lastStage = last(Object.entries(perEnvUsage));

  return (
    <ProjectStats>
      {environments && lastStage && (
        <ProjectStat
          topStats={[{
            title: `${lastStage[0]} deploys`,
            value: (
              <>
                {num(Math.round(lastStage[1].total / queryPeriodDays))}
                <span className="font-normal text-sm"> / day</span>
              </>
            )
          }]}
          childStats={[{
            title: 'Success',
            value: divide(lastStage[1].successful, lastStage[1].total)
              .map(toPercentage)
              .getOr('-')
          }]}
          onClick={{
            open: 'popup',
            contents: () => (
              <div className="w-96">
                <UsageByEnv
                  perEnvUsage={perEnvUsage}
                  pipelineCount={pipelines.length}
                  queryPeriodDays={queryPeriodDays}
                />
              </div>
            )
          }}
        />
      )}
      <ProjectStat
        topStats={[{
          title: 'Starts with artifact',
          value: divide(
            count(incrementIf(pipelineHasStartingArtifact))(pipelines),
            pipelines.length
          ).map(toPercentage).getOr('-')
        }]}
      />
      {(stagesToHighlight || []).map(stageName => {
        const stageExistsCount = count(incrementIf(pipelineHasStageNamed(stageName)))(pipelines);
        const stageExistsAndUsedCount = count(incrementIf(pipelineUsesStageNamed(stageName)))(pipelines);

        return (
          <Fragment key={stageName}>
            <ProjectStat
              topStats={[
                {
                  title: `${stageName}: exists`,
                  value: divide(stageExistsCount, pipelines.length).map(toPercentage).getOr('-'),
                  tooltip: `${num(stageExistsCount)} out of ${pipelines.length} release ${
                    stageExistsCount === 1 ? 'pipeline has' : 'pipelines have'
                  } a stage named (or containing) ${stageName}.`
                },
                {
                  title: `${stageName}: used`,
                  value: divide(stageExistsAndUsedCount, pipelines.length).map(toPercentage).getOr('-'),
                  tooltip: `${num(stageExistsAndUsedCount)} out of ${pipelines.length} release ${
                    stageExistsAndUsedCount === 1 ? 'pipeline has' : 'pipelines have'
                  } a successful deployment from ${stageName}.`
                }
              ]}
            />
          </Fragment>
        );
      })}
      <ProjectStat
        topStats={[{
          title: 'Master-only releases',
          value: (
            <LabelWithSparkline
              label={divide(masterDeploys.count, masterDeploys.total).map(toPercentage).getOr('-')}
              data={masterReleasesByWeek}
              yAxisLabel={x => `${x}%`}
              lineColor={increaseIsBetter(masterReleasesByWeek.filter(exists))}
              renderer={pathRendererSkippingUndefineds}
            />
          ),
          tooltip: `${num(masterDeploys.count)} out of ${num(masterDeploys.total)} releases were exclusively from master.${
            ignoreStagesBefore ? `<br />Branches that didn't go beyond ${ignoreStagesBefore} are not considered.` : ''
          }`
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Conforms to branch policies',
          value: divide(policyPassCount, pipelines.length).map(toPercentage).getOr('-'),
          tooltip: `${num(policyPassCount)} out of ${num(pipelines.length)} have branches that conform to the branch policy.${
            ignoreStagesBefore ? `<br />Branches that didn't go beyond ${ignoreStagesBefore} are not considered.` : ''
          }`

        }]}
      />
    </ProjectStats>
  );
};

export default ReleasePipelineSummary;
