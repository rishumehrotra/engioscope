import { equals, pipe, prop } from 'rambda';
import type { BranchPolicy, PipelineStageStats, ReleasePipelineStats } from '../../shared/types';

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

export const formatPolicies = (policies: BranchPolicy[]) => (
  policies.reduce(
    (acc, policy) => {
      if (policy.type === 'minimumNumberOfReviewers') {
        acc.numberOfReviewers.value = policy.minimumApproverCount;
        acc.numberOfReviewers.isOptional = policy.isOptional;
      } else if (policy.type === 'workItemLinking') {
        acc.workItemLinking.state = true;
        acc.workItemLinking.isOptional = policy.isOptional;
      } else if (policy.type === 'builds') {
        acc.builds.state = true;
        acc.builds.isOptional = policy.isOptional;
      } else if (policy.type === 'commentRequirements') {
        acc.commentRequirements.state = true;
        acc.commentRequirements.isOptional = policy.isOptional;
      } else if (policy.type === 'requireMergeStrategy') {
        acc.requireMergeStrategy.state = true;
        acc.requireMergeStrategy.isOptional = policy.isOptional;
      }
      return acc;
    },
    {
      numberOfReviewers: { value: 0, isOptional: false },
      workItemLinking: { state: false, isOptional: false },
      builds: { state: false, isOptional: false },
      commentRequirements: { state: false, isOptional: false },
      requireMergeStrategy: { state: false, isOptional: false }
    }
  )
);

export type FormattedPolicy = ReturnType<typeof formatPolicies>;

export const policyStatus = (aggregatedPolicy: FormattedPolicy, key: keyof FormattedPolicy) => {
  if (key === 'numberOfReviewers') {
    if (aggregatedPolicy.numberOfReviewers.value === 0) return 'fail';
    if (aggregatedPolicy.numberOfReviewers.isOptional
      || aggregatedPolicy.numberOfReviewers.value < 2
    ) {
      return 'warn';
    }
    if (
      aggregatedPolicy.numberOfReviewers.value >= 2
      && !aggregatedPolicy.numberOfReviewers.isOptional
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

export const fullPolicyStatus = (policy: FormattedPolicy) => {
  const states = Object.keys(policy).map(
    key => policyStatus(policy, key as keyof FormattedPolicy)
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
    pipe(prop('policies'), formatPolicies, fullPolicyStatus, equals('pass'))
  ));
};
