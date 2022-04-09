import React, { Fragment } from 'react';
import { last } from 'rambda';
import type { Pipeline } from '../../shared/types';
import { num } from '../helpers/utils';
import type { NormalizedPolicies } from '../../shared/pipeline-utils';
import {
  pipelineHasStartingArtifact,
  totalUsageByEnvironment,
  masterDeploysCount, pipelineHasStageNamed,
  pipelineMeetsBranchPolicyRequirements, pipelineUsesStageNamed
} from '../../shared/pipeline-utils';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';
import { count, incrementIf } from '../../shared/reducer-utils';
import UsageByEnv from './UsageByEnv';

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
};

const ReleasePipelineSummary: React.FC<ReleasePipelineSummaryProps> = ({
  pipelines, stagesToHighlight, policyForBranch, ignoreStagesBefore, environments
}) => {
  const masterDeploys = masterDeploysCount(pipelines);

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
                {num(Math.round(lastStage[1].total / 30))}
                <span className="font-normal text-sm"> / day</span>
              </>
            )
          }]}
          childStats={[{
            title: 'Success',
            value: `${Math.round((lastStage[1].successful / lastStage[1].total) * 100)}%`
          }]}
          onClick={{
            open: 'popup',
            contents: () => <div className="w-96"><UsageByEnv perEnvUsage={perEnvUsage} pipelineCount={pipelines.length} /></div>
          }}
        />
      )}
      <ProjectStat
        topStats={[{
          title: 'Starts with artifact',
          value: pipelines.length === 0
            ? '-'
            : `${Math.round((count(incrementIf(pipelineHasStartingArtifact))(pipelines) * 100) / pipelines.length)}%`
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
                  value: pipelines.length === 0 ? '0' : `${Math.round((stageExistsCount * 100) / pipelines.length)}%`,
                  tooltip: `${num(stageExistsCount)} out of ${pipelines.length} release ${
                    stageExistsCount === 1 ? 'pipeline has' : 'pipelines have'
                  } a stage named (or containing) ${stageName}.`
                },
                {
                  title: `${stageName}: used`,
                  value: pipelines.length === 0 ? '0' : `${Math.round((stageExistsAndUsedCount * 100) / pipelines.length)}%`,
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
          title: 'Master-only pipelines',
          value: masterDeploys.total === 0 ? '-' : `${Math.round((masterDeploys.count * 100) / masterDeploys.total)}%`,
          tooltip: `${num(masterDeploys.count)} out of ${masterDeploys.total} release ${
            masterDeploys.count === 1 ? 'pipeline deploys' : 'pipelines deploy'
          } exclusively from master.${
            ignoreStagesBefore ? `<br />Branches that didn't go beyond ${ignoreStagesBefore} are not considered.` : ''
          }`
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Conforms to branch policies',
          value: pipelines.length === 0 ? '-' : `${Math.round((policyPassCount * 100) / pipelines.length)}%`,
          tooltip: `${num(policyPassCount)} out of ${pipelines.length} have branches that conform to the branch policy.${
            ignoreStagesBefore ? `<br />Branches that didn't go beyond ${ignoreStagesBefore} are not considered.` : ''
          }`

        }]}
      />
    </ProjectStats>
  );
};

export default ReleasePipelineSummary;
