import { equals, pipe, prop } from 'rambda';
import type { BranchPolicies, PipelineStageStats, ReleasePipelineStats } from '../../shared/types';

const stageHasName = (stageName: string) => (
  (stage: PipelineStageStats) => (
    stage.name.toLowerCase().includes(stageName.toLowerCase())
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
  return repoBranches.every(
    branches => branches.length === 1 && branches[0].branch === 'refs/heads/master'
  );
};

export const normalizePolicy = (policies: BranchPolicies) => ({
  minimumNumberOfReviewers: {
    count: policies.minimumNumberOfReviewers?.count ?? 0,
    isOptional: policies.minimumNumberOfReviewers?.isOptional ?? false
  },
  workItemLinking: {
    state: Boolean(policies.workItemLinking),
    isOptional: policies.workItemLinking?.isOptional ?? false
  },
  builds: {
    state: Boolean(policies.builds),
    isOptional: policies.builds?.isOptional ?? false
  },
  commentRequirements: {
    state: Boolean(policies.commentRequirements),
    isOptional: policies.commentRequirements?.isOptional ?? false
  },
  requireMergeStrategy: {
    state: Boolean(policies.requireMergeStrategy),
    isOptional: policies.requireMergeStrategy?.isOptional ?? false
  }
});

export type NormalizedPolicies = ReturnType<typeof normalizePolicy>;

export const policyStatus = (aggregatedPolicy: NormalizedPolicies, key: keyof NormalizedPolicies) => {
  if (key === 'minimumNumberOfReviewers') {
    if (aggregatedPolicy.minimumNumberOfReviewers.count === 0) return 'fail';
    if (aggregatedPolicy.minimumNumberOfReviewers.isOptional
      || aggregatedPolicy.minimumNumberOfReviewers.count < 2
    ) {
      return 'warn';
    }
    if (
      aggregatedPolicy.minimumNumberOfReviewers.count >= 2
      && !aggregatedPolicy.minimumNumberOfReviewers.isOptional
    ) {
      return 'pass';
    }
    return 'fail';
  }
  if (aggregatedPolicy[key].isOptional && aggregatedPolicy[key].state) {
    return 'warn';
  }
  if (!aggregatedPolicy[key].isOptional && aggregatedPolicy[key].state) {
    return 'pass';
  }
  return 'fail';
};

export const fullPolicyStatus = (policy: NormalizedPolicies) => {
  const states = Object.keys(policy).map(
    key => policyStatus(policy, key as keyof NormalizedPolicies)
  );
  if (states.every(c => c === 'pass')) {
    return 'pass';
  }
  if (states.some(c => c === 'fail')) {
    return 'fail';
  }
  return 'warn';
};

export const pipelineMeetsBranchPolicyRequirements = (pipeline: ReleasePipelineStats) => {
  const repoBranches = Object.values(pipeline.repos);
  if (!repoBranches.length) return false;
  return repoBranches.every(branches => branches.every(
    pipe(prop('policies'), normalizePolicy, fullPolicyStatus, equals('pass'))
  ));
};
