import React, { Fragment } from 'react';
import type { Pipeline } from '../../shared/types';
import { num } from '../helpers/utils';
import type { NormalizedPolicies } from '../../shared/pipeline-utils';
import {
  pipelineDeploysExclusivelyFromMaster, pipelineHasStageNamed, pipelineMeetsBranchPolicyRequirements, pipelineUsesStageNamed
} from '../../shared/pipeline-utils';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

type ReleasePipelineSummaryProps = {
  pipelines: Pipeline[];
  stagesToHighlight?: string[];
  policyForBranch: (repoId: string, branch: string) => NormalizedPolicies;
  ignoreStagesBefore?: string;
};

const ReleasePipelineSummary: React.FC<ReleasePipelineSummaryProps> = ({
  pipelines, stagesToHighlight, policyForBranch, ignoreStagesBefore
}) => {
  const masterDeploysCount = pipelines.reduce(
    (acc, pipeline) => acc + (pipelineDeploysExclusivelyFromMaster(pipeline) ? 1 : 0),
    0
  );

  const policyPassCount = pipelines.reduce(
    (acc, pipeline) => acc + (pipelineMeetsBranchPolicyRequirements(policyForBranch)(pipeline) ? 1 : 0),
    0
  );

  return (
    <ProjectStats>
      {(stagesToHighlight || []).map(stageName => {
        const hasStage = pipelineHasStageNamed(stageName);
        const usesStage = pipelineUsesStageNamed(stageName);

        const stageExistsCount = pipelines.reduce(
          (acc, pipeline) => acc + (hasStage(pipeline) ? 1 : 0),
          0
        );

        const stageExistsAndUsedCount = pipelines.reduce(
          (acc, pipeline) => acc + (usesStage(pipeline) ? 1 : 0),
          0
        );

        return (
          <Fragment key={stageName}>
            <ProjectStat
              topStats={[
                {
                  title: `${stageName}: Exists`,
                  value: pipelines.length === 0 ? '0' : `${Math.round((stageExistsCount * 100) / pipelines.length)}%`,
                  tooltip: `${num(stageExistsCount)} out of ${pipelines.length} release ${
                    stageExistsCount === 1 ? 'pipeline has' : 'pipelines have'
                  } a stage named (or containing) ${stageName}.`
                },
                {
                  title: `${stageName}: Used`,
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
          value: pipelines.length === 0 ? '0' : `${Math.round((masterDeploysCount * 100) / pipelines.length)}%`,
          tooltip: `${num(masterDeploysCount)} out of ${pipelines.length} release ${
            masterDeploysCount === 1 ? 'pipeline deploys' : 'pipelines deploy'
          } exclusively from master.${
            ignoreStagesBefore ? `<br />Branches that didn't go beyond ${ignoreStagesBefore} are not considered.` : ''
          }`
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Conforms to branch policies',
          value: pipelines.length === 0 ? '0' : `${Math.round((policyPassCount * 100) / pipelines.length)}%`,
          tooltip: `${num(policyPassCount)} out of ${pipelines.length} have branches that conform to the branch policy.${
            ignoreStagesBefore ? `<br />Branches that didn't go beyond ${ignoreStagesBefore} are not considered.` : ''
          }`

        }]}
      />
    </ProjectStats>
  );
};

export default ReleasePipelineSummary;

