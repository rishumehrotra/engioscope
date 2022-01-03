import type {
  BranchPolicies, Pipeline, PipelineCount, PipelineStage
} from '../../shared/types';

export type PipelineStageWithCounts = PipelineStage & PipelineCount;

export const mergeStagesAndCounts = (stageCounts: PipelineCount[]) => (
  (stage: PipelineStage): PipelineStageWithCounts => {
    const matchingExistingStage = stageCounts.find(s => s.name === stage.name);

    return {
      ...stage,
      successful: matchingExistingStage?.successful ?? 0,
      total: matchingExistingStage?.total ?? 0
    };
  }
);

const stageHasName = (stageName: string) => (
  (stage: PipelineStage | PipelineCount) => (
    stage.name.toLowerCase().includes(stageName.toLowerCase())
  )
);

export const pipelineHasStageNamed = (stageName: string) => (
  (pipeline: Pipeline) => pipeline.stageCounts.some(stageHasName(stageName))
);

export const pipelineUsesStageNamed = (stageName: string) => (
  (pipeline: Pipeline) => {
    const matchingStages = pipeline.stageCounts.filter(stageHasName(stageName));
    if (!matchingStages.length) return false;
    return matchingStages.some(stage => stage.successful > 0);
  }
);

export const pipelineHasUnusedStageNamed = (stageName: string) => (
  (pipeline: Pipeline) => {
    const matchingStages = pipeline.stageCounts.filter(stageHasName(stageName));
    if (!matchingStages.length) return false;
    return matchingStages.every(stage => stage.successful === 0);
  }
);

export const pipelineDeploysExclusivelyFromMaster = (pipeline: Pipeline) => {
  const repoBranches = [...new Set(Object.values(pipeline.repos).flatMap(r => r.branches))];
  if (!repoBranches.length) return false;
  return repoBranches.length === 1 && repoBranches[0] === 'refs/heads/master';
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
      || aggregatedPolicy.minimumNumberOfReviewers.count < 1
    ) {
      return 'fail';
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

export const pipelineMeetsBranchPolicyRequirements = (
  policyForBranch: (repoId: string, branch: string) => NormalizedPolicies
) => (pipeline: Pipeline) => (
  Object.entries(pipeline.repos)
    .reduce<ReturnType<typeof fullPolicyStatus>[]>((acc, [repoId, { branches }]) => {
      branches.forEach(branch => {
        acc.push(fullPolicyStatus(policyForBranch(repoId, branch)));
      });
      return acc;
    }, [])
    .every(p => p === 'pass')
);
