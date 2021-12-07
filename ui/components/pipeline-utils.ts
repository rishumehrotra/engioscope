import type { PipelineStageStats, ReleasePipelineStats } from '../../shared/types';

const stageHasName = (pipelineName: string) => (
  (stage: PipelineStageStats) => (
    pipelineName.toLowerCase().includes(stage.name.toLowerCase())
  )
);

export const pipelineHasStageNamed = (stageName: string) => (
  (pipeline: ReleasePipelineStats) => pipeline.stages.some(stageHasName(stageName))
);

export const pipelineUsesStageNamed = (stageName: string) => (
  (pipeline: ReleasePipelineStats) => {
    const matchingStages = pipeline.stages.filter(stageHasName(stageName));
    if (!matchingStages.length) return false;
    return matchingStages.some(stage => stage.successCount > 0);
  }
);

export const pipelineHasUnusedStageNamed = (stageName: string) => (
  (pipeline: ReleasePipelineStats) => {
    const matchingStages = pipeline.stages.filter(stageHasName(stageName));
    if (!matchingStages.length) return false;
    return matchingStages.every(stage => stage.successCount === 0);
  }
);

export const pipelineDeploysExclusivelyFromMaster = (pipeline: ReleasePipelineStats) => {
  const repoBranches = Object.values(pipeline.repos);
  if (!repoBranches.length) return false;
  return repoBranches.every(branches => branches.length === 1 && branches[0].branch === 'master');
};
