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

const envRowTooltip = (env: string, successful: number, total: number) => `
  <b>${env}</b><br />
  Successful deployments: <b>${num(successful)}</b><br />
  Total deployments: <b>${num(total)}</b>
`;

const UsageByEnv: React.FC<{ perEnvUsage: Record<string, { successful: number; total: number }>}> = ({
  perEnvUsage
}) => {
  const max = Math.max(...Object.values(perEnvUsage).map(({ total }) => total));
  return (
    <div className="grid grid-cols-4 w-96 gap-3">
      {Object.entries(perEnvUsage).map(([env, { successful, total }]) => (
        <Fragment key={env}>
          <div className="text-gray-600 text-right">{env}</div>
          <div
            className="relative w-full col-span-3"
            data-tip={envRowTooltip(env, successful, total)}
            data-html
          >
            <div
              className="absolute top-0 left-0 h-full bg-gray-300 rounded-r-md"
              style={{ width: `${(total * 100) / max}%` }}
            />
            <div
              className="absolute top-0 left-0 h-full bg-lime-400 rounded-r-md shadow-md"
              style={{ width: `${(successful * 100) / max}%` }}
            />
            <div className="absolute top-0 left-0 h-full w-full text-sm pt-0.5 pl-2">
              <b>{`${num(Math.round(total / 30))}`}</b>
              {' deploys/day, '}
              <b>{`${Math.round((successful * 100) / total)}%`}</b>
              {' success rate'}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
};

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
      <ProjectStat
        topStats={[{
          title: 'Starts with artifact',
          value: `${Math.round((count(incrementIf(pipelineHasStartingArtifact))(pipelines) * 100) / pipelines.length)}%`
        }]}
      />
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
          popupContents={() => <UsageByEnv perEnvUsage={perEnvUsage} />}
        />
      )}
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

