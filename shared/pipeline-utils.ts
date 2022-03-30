import { head } from 'rambda';
import type {
  BranchPolicies, Pipeline, PipelineCount, PipelineStage
} from './types';
import { exists } from './utils';

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

const repoBranches = (pipeline: Pipeline) => (
  [...new Set(Object.values(pipeline.repos).flatMap(r => r.branches))]
);

export const pipelineDeploysExclusivelyFromMaster = (pipeline: Pipeline) => {
  const branches = repoBranches(pipeline);
  if (!branches.length) return false;
  return branches.length === 1 && branches[0] === 'refs/heads/master';
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
      aggregatedPolicy.minimumNumberOfReviewers.count >= 1
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
  const states = Object.keys(policy)
    .filter(key => key as keyof NormalizedPolicies !== 'requireMergeStrategy')
    .map(
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

export const masterDeploysCount = (pipelines: Pipeline[]) => {
  const pipelinesWithBranches = pipelines.filter(p => repoBranches(p).length > 0);
  return {
    count: pipelinesWithBranches.filter(pipelineDeploysExclusivelyFromMaster).length,
    total: pipelinesWithBranches.length
  };
};

export const isPipelineInGroup = (groupName: string, repos: string[]) => (
  (pipeline: Pipeline) => (
    pipeline.name.toLowerCase().startsWith(groupName.toLowerCase())
      ? true
      : Object.values(pipeline.repos).some(r => repos.includes(r.name))
  )
);

export const usageByEnvironment = (environments?: string[]) => (pipeline: Pipeline) => {
  if (!environments) return undefined;

  return environments.reduce<Record<string, { successful: number; total: number}>>((acc, env) => {
    const matchingStage = head(pipeline.stageCounts
      .filter(stageHasName(env))
      .sort((a, b) => b.total - a.total));

    if (!matchingStage) return acc;

    acc[env] = { successful: matchingStage.successful, total: matchingStage.total };
    return acc;
  }, {});
};

export const totalUsageByEnvironment = (environments?: string[]) => (pipelines: Pipeline[]) => (
  Object.fromEntries(
    Object.entries(
      pipelines
        .map(usageByEnvironment(environments))
        .filter(exists)
        .reduce((acc, item) => {
          Object.entries(item)
            .forEach(([env, { successful, total }]) => {
              acc[env] = {
                successful: (acc[env]?.successful || 0) + successful,
                total: (acc[env]?.total || 0) + total
              };
            });
          return acc;
        }, {})
    )
      .sort(([a], [b]) => {
        const envs = environments?.map(e => e.toLowerCase());
        if (!envs) { return 0; }
        return envs.indexOf(a.toLowerCase()) - envs.indexOf(b.toLowerCase());
      })
  )
);
